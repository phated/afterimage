import { CONTRACT_ADDRESS } from '@zkgame/contracts';
import type { Transaction, TxIntent, EthAddress } from '@projectsophon/types';
import {
  ContractCaller,
  ConnectionManager,
  ContractManager,
  ethToWei,
  TxExecutor,
} from '@projectsophon/network';
import { EventEmitter } from 'events';
import type {
  BigNumber,
  BigNumber as EthersBN,
  ContractFunction /*, ethers, Event, providers*/,
  providers,
} from 'ethers';
import {
  ContractsAPIEvent,
  type SubmittedBattlePlayer,
  type SubmittedClaimTreasure,
  type SubmittedInitPlayer,
  type SubmittedMovePlayer,
  type SubmittedTx,
  type UnconfirmedBattlePlayer,
  type UnconfirmedClaimTreasure,
  type UnconfirmedInitPlayer,
  type UnconfirmedMovePlayer,
} from '../_types/ContractAPITypes';
import { loadCoreContract } from './Blockchain';

/**
 * Roughly contains methods that map 1:1 with functions that live in the contract. Responsible for
 * reading and writing to and from the blockchain.
 *
 * @todo don't inherit from {@link EventEmitter}. instead use {@link Monomitter}
 */
export class ContractsAPI extends EventEmitter {
  /**
   * Don't allow users to submit txs if balance falls below this amount/
   */
  private static readonly MIN_BALANCE = ethToWei(0.002);

  /**
   * Instrumented {@link ThrottledConcurrentQueue} for blockchain reads.
   */
  private readonly contractCaller: ContractCaller;

  /**
   * Instrumented {@link ThrottledConcurrentQueue} for blockchain writes.
   */
  private readonly txExecutor: TxExecutor | undefined;

  /**
   * Our connection to the blockchain. In charge of low level networking, and also of the burner
   * wallet.
   */
  private ethConnection: ConnectionManager;

  private contractManager: ContractManager;

  getContract() {
    return this.contractManager.loadContract(CONTRACT_ADDRESS, loadCoreContract);
  }

  constructor(ethConnection: ConnectionManager) {
    super();
    this.contractCaller = new ContractCaller();
    this.ethConnection = ethConnection;
    this.contractManager = new ContractManager(ethConnection);
    this.txExecutor = new TxExecutor(
      ethConnection,
      this.getGasFeeForTransaction.bind(this),
      this.beforeQueued.bind(this),
      this.beforeTransaction.bind(this),
      this.afterTransaction.bind(this)
    );
  }

  /**
   * We pass this function into {@link TxExecutor} to calculate what gas fee we should use for the
   * given transaction. The result is either a number, measured in gwei, represented as a string, or
   * a string representing that we want to use an auto gas setting.
   */
  private getGasFeeForTransaction(tx: Transaction): string {
    return '50';
  }

  /**
   * This function is called by {@link TxExecutor} before a transaction is queued.
   * It gives the client an opportunity to prevent a transaction from being queued based
   * on business logic or user interaction.
   *
   * Reject the promise to prevent the queued transaction from being queued.
   */
  private async beforeQueued(
    id: number,
    intent: TxIntent,
    overrides?: providers.TransactionRequest
  ): Promise<void> {
    if (!this.ethConnection.signer) {
      throw new Error("can't send a transaction, no signer");
    }

    const balance = await this.ethConnection.signer.getBalance();

    if (balance.lt(ContractsAPI.MIN_BALANCE)) {
      throw new Error('xDAI balance too low!');
    }
  }

  /**
   * This function is called by {@link TxExecutor} before each transaction. It gives the client an
   * opportunity to prevent a transaction from going through based on business logic or user
   * interaction. To prevent the queued transaction from being submitted, throw an Error.
   */
  private async beforeTransaction(tx: Transaction): Promise<void> {
    console.log('Processing', tx);
  }

  private async afterTransaction(_txRequest: Transaction, txDiagnosticInfo: unknown) {
    this.emit(ContractsAPIEvent.TxSubmitted, txDiagnosticInfo);
  }

  private makeCall<T>(contractViewFunction: ContractFunction<T>, args: unknown[] = []): Promise<T> {
    return this.contractCaller.makeCall(contractViewFunction, args);
  }

  public async getGridUpperBound(): Promise<number> {
    const contract = await this.getContract();
    return (await this.makeCall<EthersBN>(contract.GRID_UPPER_BOUND)).toNumber();
  }

  public async getSaltUpperBound(): Promise<number> {
    const contract = await this.getContract();
    return (await this.makeCall<EthersBN>(contract.SALT_UPPER_BOUND)).toNumber();
  }

  public async getWins(address: EthAddress): Promise<number> {
    const contract = await this.getContract();
    return (await this.makeCall<EthersBN>(contract.getWins, [address])).toNumber();
  }

  public async initPlayer(action: UnconfirmedInitPlayer) {
    if (!this.txExecutor) {
      throw new Error('no signer, cannot execute tx');
    }

    const contract = await this.getContract();

    const tx = await this.txExecutor.queueTransaction({
      contract,
      methodName: action.methodName,
      args: action.callArgs,
    });
    const unminedInitPlayerTx: SubmittedInitPlayer = {
      ...action,
      txHash: (await tx.submittedPromise).hash,
      sentAtTimestamp: Math.floor(Date.now() / 1000),
    };

    return this.waitFor(unminedInitPlayerTx, tx.confirmedPromise);
  }

  public async movePlayer(action: UnconfirmedMovePlayer) {
    if (!this.txExecutor) {
      throw new Error('no signer, cannot execute tx');
    }

    const contract = await this.getContract();

    const tx = await this.txExecutor.queueTransaction({
      contract,
      methodName: action.methodName,
      args: action.callArgs,
    });
    const unminedMovePlayerTx: SubmittedMovePlayer = {
      ...action,
      txHash: (await tx.submittedPromise).hash,
      sentAtTimestamp: Math.floor(Date.now() / 1000),
    };

    return this.waitFor(unminedMovePlayerTx, tx.confirmedPromise);
  }

  public async battlePlayer(action: UnconfirmedBattlePlayer) {
    if (!this.txExecutor) {
      throw new Error('no signer, cannot execute tx');
    }

    const contract = await this.getContract();

    const tx = await this.txExecutor.queueTransaction({
      contract,
      methodName: action.methodName,
      args: action.callArgs,
    });
    const unminedBattlePlayerTx: SubmittedBattlePlayer = {
      ...action,
      txHash: (await tx.submittedPromise).hash,
      sentAtTimestamp: Math.floor(Date.now() / 1000),
    };

    return this.waitFor(unminedBattlePlayerTx, tx.confirmedPromise);
  }

  public async getBattlePower(player: EthAddress): Promise<bigint[]> {
    const contract = await this.getContract();
    return (await this.makeCall<BigNumber[]>(contract.getBattlePower, [player])).map((x) =>
      x.toBigInt()
    );
  }

  public async claimTreasure(action: UnconfirmedClaimTreasure) {
    if (!this.txExecutor) {
      throw new Error('no signer, cannot execute tx');
    }

    const contract = await this.getContract();

    const tx = await this.txExecutor.queueTransaction({
      contract,
      methodName: action.methodName,
      args: action.callArgs,
    });
    const unminedClaimTreasureTx: SubmittedClaimTreasure = {
      ...action,
      txHash: (await tx.submittedPromise).hash,
      sentAtTimestamp: Math.floor(Date.now() / 1000),
    };

    return this.waitFor(unminedClaimTreasureTx, tx.confirmedPromise);
  }

  /**
   * Given an unconfirmed (but submitted) transaction, emits the appropriate
   * [[ContractsAPIEvent]].
   */
  public waitFor(submitted: SubmittedTx, receiptPromise: Promise<providers.TransactionReceipt>) {
    this.emit(ContractsAPIEvent.TxSubmitted, submitted);

    return receiptPromise
      .then((receipt) => {
        this.emit(ContractsAPIEvent.TxConfirmed, submitted);
        return receipt;
      })
      .catch((e) => {
        this.emit(ContractsAPIEvent.TxReverted, submitted, e);
        throw e;
      });
  }
}
