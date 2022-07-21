import { EthConnection } from "@darkforest_eth/network";
import { monomitter, Monomitter, Subscription } from "@darkforest_eth/events";
import { perlin } from "@darkforest_eth/hashing";
import { EthAddress, WorldCoords } from "@darkforest_eth/types";
import { EventEmitter } from "events";
import { ContractsAPI, makeContractsAPI } from "./ContractsAPI";
import {
  ContractMethodName,
  ContractsAPIEvent,
  isUnconfirmedMovePlayer,
  SubmittedTx,
  TxIntent,
  UnconfirmedMovePlayer,
  UnconfirmedInitPlayer,
} from "../_types/ContractAPITypes";
import { hexValue } from "ethers/lib/utils";
import { BigNumber } from "ethers";
import { MinerManager } from "./Miner";

class GameManager extends EventEmitter {
  /**
   * The ethereum address of the player who is currently logged in. We support 'no account',
   * represented by `undefined` in the case when you want to simply load the game state from the
   * contract and view it without be able to make any moves.
   */
  private readonly account: EthAddress | undefined;

  /**
   * Allows us to make contract calls, and execute transactions. Be careful about how you use this
   * guy. You don't want to cause your client to send an excessive amount of traffic to whatever
   * node you're connected to.
   *
   * Interacting with the blockchain isn't free, and we need to be mindful about about the way our
   * application interacts with the blockchain. The current rate limiting strategy consists of three
   * points:
   *
   * - data that needs to be fetched often should be fetched in bulk.
   * - rate limit smart contract calls (reads from the blockchain), implemented by
   *   {@link ContractCaller} and transactions (writes to the blockchain on behalf of the player),
   *   implemented by {@link TxExecutor} via two separately tuned {@link ThrottledConcurrentQueue}s.
   */
  private readonly contractsAPI: ContractsAPI;

  /**
   * An interface to the blockchain that is a little bit lower-level than {@link ContractsAPI}. It
   * allows us to do basic operations such as wait for a transaction to complete, check the player's
   * address and balance, etc.
   */
  private readonly ethConnection: EthConnection;

  private readonly GRID_UPPER_BOUND: number;
  public playerUpdated$: Monomitter<void>;

  public minerManager: MinerManager;

  private constructor(
    account: EthAddress | undefined,
    ethConnection: EthConnection,
    contractsAPI: ContractsAPI,
    GRID_UPPER_BOUND: number
  ) {
    super();

    this.account = account;
    this.ethConnection = ethConnection;
    this.contractsAPI = contractsAPI;
    this.GRID_UPPER_BOUND = GRID_UPPER_BOUND;
    this.playerUpdated$ = monomitter();
    this.minerManager = MinerManager.create(GRID_UPPER_BOUND);
  }

  static async create(ethConnection: EthConnection) {
    const account = ethConnection.getAddress();

    if (!account) {
      throw new Error("no account on eth connection");
    }

    const contractsAPI = await makeContractsAPI(ethConnection);
    const GRID_UPPER_BOUND = await contractsAPI.getGridUpperBound();
    const gameManager = new GameManager(
      account,
      ethConnection,
      contractsAPI,
      GRID_UPPER_BOUND
    );

    // important that this happens AFTER we load the game state from the blockchain. Otherwise our
    // 'loading game state' contract calls will be competing with events from the blockchain that
    // are happening now, which makes no sense.
    contractsAPI.setupEventListeners();

    // set up listeners: whenever ContractsAPI reports some game state update,
    // do some logic
    // also, handle state updates for locally-initialized txIntents
    gameManager.contractsAPI
      .on(
        ContractsAPIEvent.PlayerUpdated,
        async (moverAddr: EthAddress, coords: WorldCoords) => {
          // todo: update in memory data store
          // todo: emit event to UI
          // TODO: do something???
          console.log("event player", coords);

          if (!gameManager.account) {
            throw new Error("no account set");
          }
          gameManager.playerUpdated$.publish();
        }
      )
      .on(ContractsAPIEvent.TxSubmitted, (unconfirmedTx: SubmittedTx) => {
        // todo: save the tx to localstorage
        gameManager.onTxSubmit(unconfirmedTx);
      })
      .on(ContractsAPIEvent.TxConfirmed, async (unconfirmedTx: SubmittedTx) => {
        // todo: remove the tx from localstorage
        gameManager.onTxConfirmed(unconfirmedTx);
      })
      .on(
        ContractsAPIEvent.TxReverted,
        async (unconfirmedTx: SubmittedTx, error: any) => {
          // todo: remove the tx from localStorage
          gameManager.onTxReverted(unconfirmedTx);
        }
      );

    return gameManager;
  }

  public startMining(startPos: WorldCoords, blockhash: String) {
    this.minerManager.startMining(this.GRID_UPPER_BOUND, startPos, blockhash);
  }

  public stopMining() {
    this.minerManager.stopMining();
  }

  private onTxIntent(txIntent: TxIntent): void {
    // hook to be called on txIntent initialization
    // pop up a little notification, save txIntent to memory
    // if you want to display it to UI
    console.log("txIntent initialized:");
    console.log(txIntent);
  }

  private onTxSubmit(unminedTx: SubmittedTx): void {
    // hook to be called on successful tx submission to mempool
    // pop up a little notification or log something to console
    console.log("submitted tx:");
    console.log(unminedTx);
  }

  private onTxIntentFail(txIntent: TxIntent, e: Error): void {
    // hook to be called when tx fails to submit (SNARK proof fails,
    // or rejected from mempool for whatever reason
    // pop up a little notification, clear the txIntent from memory
    // if it was being displayed in UI
    console.log(`txIntent failed with error ${e.message}`);
    console.log(txIntent);
  }

  private onTxConfirmed(tx: SubmittedTx) {
    // hook to be called when tx is mined successfully
    // pop up a little notification or log block explorer link
    // clear txIntent from memory if it was being displayed in UI
    console.log("confirmed tx:");
    console.log(tx);
  }

  private onTxReverted(tx: SubmittedTx) {
    // hook to be called if tx reverts
    // pop up a little notification or log block explorer link
    // clear txIntent from memory if it was being displayed in UI
    console.log("reverted tx:");
    console.log(tx);
  }

  getGridUpperBound(): number {
    return this.GRID_UPPER_BOUND;
  }
}

export default GameManager;
