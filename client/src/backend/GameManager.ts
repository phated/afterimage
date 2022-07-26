import type { ConnectionManager } from '@projectsophon/network';
import { monomitter, type Monomitter } from '@projectsophon/events';
import type { EthAddress, WorldCoords } from '@projectsophon/types';
import { buildContractCallArgs } from '@projectsophon/snarkjs-helpers';
import { address } from '@projectsophon/serde';
import { EventEmitter } from 'events';
import { ContractsAPI } from './ContractsAPI';
import {
  ContractMethodName,
  ContractsAPIEvent,
  type SubmittedTx,
  type TxIntent,
  type UnconfirmedMovePlayer,
  type UnconfirmedInitPlayer,
  type UnconfirmedBattlePlayer,
  type UnconfirmedClaimTreasure,
} from '../_types/ContractAPITypes';
import { SnarkProverQueue } from './SnarkManager';
import { mimcSponge, modPBigIntNative } from '@projectsophon/hashing';
import initCircuitPath from '@zkgame/snarks/init.wasm?url';
import initCircuitZkey from '@zkgame/snarks/init.zkey?url';
import moveCircuitPath from '@zkgame/snarks/move.wasm?url';
import moveCircuitZkey from '@zkgame/snarks/move.zkey?url';
import battleCircuitPath from '@zkgame/snarks/battle.wasm?url';
import battleCircuitZkey from '@zkgame/snarks/battle.zkey?url';
import {
  getRandomActionId,
  type RawCommitment,
  type Tile,
  TileKnowledge,
  type CommitmentInfo,
  type OptimisticCommitmentInfo,
  type CommitmentMetadata,
  power255,
} from '../utils';
import { MinerManager } from './Miner';
import type { ZKGame } from '@zkgame/typechain';
import type { TypedEventFilter, TypedListener } from '@zkgame/typechain/common';

export function subscribe<Event extends keyof ZKGame['filters']>(
  contract: ZKGame,
  evt: Event,
  fn: TypedListener<
    ReturnType<ZKGame['filters'][Event]> extends TypedEventFilter<infer T> ? T : never
  >
) {
  const filter = contract.filters[evt]();
  contract.on(filter, fn);

  return () => {
    contract.off(filter, fn);
  };
}

class GameManager extends EventEmitter {
  /**
   * The ethereum address of the player who is currently logged in. We support 'no account',
   * represented by `undefined` in the case when you want to simply load the game state from the
   * contract and view it without be able to make any moves.
   */
  private account: EthAddress | undefined;

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
  private readonly ethConnection: ConnectionManager;
  private readonly snarkProverQueue: SnarkProverQueue;

  private selfInfo!: CommitmentInfo;
  private optimisticSelfInfo!: OptimisticCommitmentInfo;

  private readonly GRID_UPPER_BOUND: number;
  private readonly SALT_UPPER_BOUND: number;
  public playerUpdated$: Monomitter<void>;
  public minedTilesUpdated$: Monomitter<void>;
  public battleUpdated$: Monomitter<void>;

  public addressToLatestCommitment: Map<EthAddress, string>;
  public commitmentToMetadata: Map<string, CommitmentMetadata>;
  public commitmentToMinedCommitment: Map<string, RawCommitment>;
  public minerManager: MinerManager;
  private tiles: Tile[][];
  public latestEventBlockNum: number;
  private selfWins: number;

  private constructor(
    account: EthAddress | undefined,
    ethConnection: ConnectionManager,
    snarkProverQueue: SnarkProverQueue,
    contractsAPI: ContractsAPI,
    GRID_UPPER_BOUND: number,
    SALT_UPPER_BOUND: number,
    latestEventBlockNum: number
  ) {
    super();

    this.account = account;
    this.ethConnection = ethConnection;
    this.snarkProverQueue = snarkProverQueue;
    this.contractsAPI = contractsAPI;
    this.GRID_UPPER_BOUND = GRID_UPPER_BOUND;
    this.SALT_UPPER_BOUND = SALT_UPPER_BOUND;
    this.playerUpdated$ = monomitter();
    this.minedTilesUpdated$ = monomitter();
    this.battleUpdated$ = monomitter();
    this.selfWins = 0;
    this.tiles = [];
    for (let i = 0; i < GRID_UPPER_BOUND; i++) {
      const row = [];
      for (let j = 0; j < GRID_UPPER_BOUND; j++) {
        row.push({ coords: { x: i, y: j }, tileType: TileKnowledge.UNKNOWN, metas: [] });
      }
      this.tiles.push(row);
    }
    this.addressToLatestCommitment = new Map();
    this.commitmentToMetadata = new Map();
    this.commitmentToMinedCommitment = new Map();
    this.minerManager = MinerManager.create(GRID_UPPER_BOUND);
    this.latestEventBlockNum = latestEventBlockNum;
  }

  static async create(ethConnection: ConnectionManager) {
    if (!ethConnection.account) {
      throw new Error('no account on eth connection');
    }

    const contractsAPI = new ContractsAPI(ethConnection);
    const GRID_UPPER_BOUND = await contractsAPI.getGridUpperBound();
    const SALT_UPPER_BOUND = await contractsAPI.getSaltUpperBound();
    const latestEventBlockNum = await ethConnection.provider.getBlockNumber();
    const snarkProverQueue = new SnarkProverQueue();
    const gameManager = new GameManager(
      ethConnection.account,
      ethConnection,
      snarkProverQueue,
      contractsAPI,
      GRID_UPPER_BOUND,
      SALT_UPPER_BOUND,
      latestEventBlockNum
    );

    const contract = await contractsAPI.getContract();

    // set up listeners: whenever ContractsAPI reports some game state update,
    // do some logic
    // also, handle state updates for locally-initialized txIntents
    subscribe(contract, 'PlayerUpdated', async (mover, commitment, blockNum) => {
      const moverAddr = address(mover);
      // todo: update in memory data store
      // todo: emit event to UI
      // TODO: do something???
      console.log('event player', moverAddr, commitment);

      gameManager.latestEventBlockNum = await ethConnection.provider.getBlockNumber();

      // reset previous one
      const prevCommitment = gameManager.addressToLatestCommitment.get(moverAddr);
      if (prevCommitment) {
        const oldMetaData = gameManager.commitmentToMetadata.get(prevCommitment)!;
        oldMetaData.isCurrent = false;
        gameManager.commitmentToMetadata.set(prevCommitment, oldMetaData);
      }

      gameManager.addressToLatestCommitment.set(moverAddr, commitment.toString());
      gameManager.commitmentToMetadata.set(commitment.toString(), {
        commitment: commitment.toString(),
        address: moverAddr,
        blockNum: blockNum.toString(),
        isCurrent: true,
      });

      if (gameManager.commitmentToMinedCommitment.get(commitment.toString())) {
        const commit = gameManager.commitmentToMinedCommitment.get(commitment.toString())!;
        gameManager.tiles[commit.x][commit.y].tileType = TileKnowledge.KNOWN;
        if (gameManager.commitmentToMetadata.get(commit.commitment) !== undefined) {
          const meta = gameManager.commitmentToMetadata.get(commit.commitment)!;
          gameManager.tiles[commit.x][commit.y].metas.push(meta);
        }
      }

      if (
        gameManager.optimisticSelfInfo &&
        gameManager.optimisticSelfInfo.commitment === commitment.toString()
      ) {
        gameManager.selfInfo = gameManager.optimisticSelfInfo;
      }

      if (!gameManager.account) {
        throw new Error('no account set');
      }
      gameManager.playerUpdated$.publish();
    });

    subscribe(contract, 'BattleUpdated', async (player1, player2) => {
      console.log('event battle', player1, player2);
      gameManager.selfWins = await gameManager.fetchWins();
      gameManager.battleUpdated$.publish();
    });

    contractsAPI
      .on(ContractsAPIEvent.TxSubmitted, (unconfirmedTx: SubmittedTx) => {
        // todo: save the tx to localstorage
        gameManager.onTxSubmit(unconfirmedTx);
      })
      .on(ContractsAPIEvent.TxConfirmed, async (unconfirmedTx: SubmittedTx) => {
        // todo: remove the tx from localstorage
        gameManager.onTxConfirmed(unconfirmedTx);
      })
      .on(ContractsAPIEvent.TxReverted, async (unconfirmedTx: SubmittedTx, error: any) => {
        // todo: remove the tx from localStorage
        gameManager.onTxReverted(unconfirmedTx);
      });

    return gameManager;
  }

  public processMine(commits: RawCommitment[]) {
    for (const commit of commits) {
      this.commitmentToMinedCommitment.set(commit.commitment, {
        x: commit.x,
        y: commit.y,
        blockhash: commit.blockhash,
        salt: commit.salt.toString(),
        commitment: commit.commitment,
      });
      this.tiles[commit.x][commit.y].tileType = TileKnowledge.KNOWN;
      if (this.commitmentToMetadata.get(commit.commitment) !== undefined) {
        const meta = this.commitmentToMetadata.get(commit.commitment)!;
        this.tiles[commit.x][commit.y].metas.push(meta);
      }
    }
    this.minedTilesUpdated$.publish();
  }

  public async startMining(worldLoc?: WorldCoords) {
    if (!worldLoc) {
      console.warn('no location to mine');
      return;
    }
    const latestBlockNumber = await this.ethConnection.provider.getBlockNumber();
    const possibleHashes = [];
    for (var i = latestBlockNumber - 63; i <= latestBlockNumber; i++) {
      const block = await this.ethConnection.provider.getBlock(i);
      possibleHashes.push(block.hash);
    }
    this.minerManager.startMining(
      this.GRID_UPPER_BOUND,
      this.SALT_UPPER_BOUND,
      worldLoc.x,
      worldLoc.y,
      possibleHashes,
      this.processMine.bind(this)
    );
  }

  public stopMining() {
    this.minerManager.stopMining();
  }

  private onTxIntent(txIntent: TxIntent): void {
    // hook to be called on txIntent initialization
    // pop up a little notification, save txIntent to memory
    // if you want to display it to UI
    console.log('txIntent initialized:');
    console.log(txIntent);
  }

  private onTxSubmit(unminedTx: SubmittedTx): void {
    // hook to be called on successful tx submission to mempool
    // pop up a little notification or log something to console
    console.log('submitted tx:');
    console.log(unminedTx);
  }

  private onTxIntentFail(txIntent: TxIntent, e: Error): void {
    // hook to be called when tx fails to submit (SNARK proof fails,
    // or rejected from mempool for whatever reason
    // pop up a little notification, clear the txIntent from memory
    // if it was being displayed in UI
    console.log(`txIntent failed with error ${e.message}`);
    if (this.optimisticSelfInfo.actionId == txIntent.actionId) {
      this.optimisticSelfInfo = { ...this.selfInfo, actionId: 'none' };
    }
    console.log(txIntent);
  }

  private onTxConfirmed(tx: SubmittedTx) {
    // hook to be called when tx is mined successfully
    // pop up a little notification or log block explorer link
    // clear txIntent from memory if it was being displayed in UI
    console.log('confirmed tx:');
    console.log(tx);
  }

  private onTxReverted(tx: SubmittedTx) {
    // hook to be called if tx reverts
    // pop up a little notification or log block explorer link
    // clear txIntent from memory if it was being displayed in UI
    console.log('reverted tx:');
    if (this.optimisticSelfInfo.actionId == tx.actionId) {
      this.optimisticSelfInfo = { ...this.selfInfo, actionId: 'none' };
    }
    console.log(tx);
  }

  getGridUpperBound(): number {
    return this.GRID_UPPER_BOUND;
  }

  getSaltUpperBound(): number {
    return this.SALT_UPPER_BOUND;
  }

  private async assembleNewLocationSnarkInput(x: number, y: number) {
    const latestBlockNumber = await this.ethConnection.provider.getBlockNumber();
    const possibleHashes = [];
    for (var i = latestBlockNumber - 31; i <= latestBlockNumber; i++) {
      const block = await this.ethConnection.provider.getBlock(i);
      console.log('hash out', block.hash, modPBigIntNative(BigInt(block.hash)));
      possibleHashes.push(modPBigIntNative(BigInt(block.hash)));
    }

    const possibleHashesHash = mimcSponge(possibleHashes, 1, 22, 123)[0];
    console.log('possibleHashesHash:', possibleHashesHash);
    const blockhash = possibleHashes[Math.floor(Math.random() * possibleHashes.length)];

    const salt = Math.floor(Math.random() * this.SALT_UPPER_BOUND);

    const commitment = mimcSponge(
      [BigInt(x), BigInt(y), BigInt(blockhash), BigInt(salt)],
      1,
      220,
      123
    )[0];

    return {
      latestBlockNumber,
      snarkInput: {
        x: x.toString(),
        y: y.toString(),
        possibleHashes: possibleHashes.map((x) => x.toString()),
        possibleHashesHash: possibleHashesHash.toString(),
        blockhash: blockhash.toString(),
        salt: salt.toString(),
        saltUpperBound: this.SALT_UPPER_BOUND.toString(),
        gridUpperBound: this.GRID_UPPER_BOUND.toString(),
        commitment: commitment.toString(),
      },
    };
  }

  private async assembleInitSnarkInput(x: number, y: number, actionId: string) {
    const { latestBlockNumber, snarkInput } = await this.assembleNewLocationSnarkInput(x, y);

    console.log('snarkInp', snarkInput);

    const proofAndSignalData = await this.snarkProverQueue.prove(
      snarkInput,
      initCircuitPath,
      initCircuitZkey
    );

    const callArgs = [
      (latestBlockNumber - 31).toString(),
      latestBlockNumber.toString(),
      ...buildContractCallArgs(proofAndSignalData.proof, proofAndSignalData.publicSignals),
    ];

    console.log('callArgs', callArgs);

    this.optimisticSelfInfo = {
      x,
      y,
      blockhash: snarkInput.blockhash,
      salt: snarkInput.salt,
      commitment: snarkInput.commitment,
      address: this.account!,
      actionId,
    };

    return callArgs;
  }

  private async assembleMoveSnarkInput(x: number, y: number, actionId: string) {
    const { latestBlockNumber, snarkInput } = await this.assembleNewLocationSnarkInput(x, y);

    const fullInput = {
      oldX: this.selfInfo.x.toString(),
      oldY: this.selfInfo.y.toString(),
      oldBlockhash: this.selfInfo.blockhash,
      oldSalt: this.selfInfo.salt,
      oldCommitment: this.selfInfo.commitment,
      newX: snarkInput.x,
      newY: snarkInput.y,
      newBlockhash: snarkInput.blockhash,
      newSalt: snarkInput.salt,
      newCommitment: snarkInput.commitment,
      possibleHashes: snarkInput.possibleHashes,
      possibleHashesHash: snarkInput.possibleHashesHash,
      saltUpperBound: snarkInput.saltUpperBound,
      gridUpperBound: snarkInput.gridUpperBound,
    };
    console.log('fullInput', fullInput);

    const proofAndSignalData = await this.snarkProverQueue.prove(
      fullInput,
      moveCircuitPath,
      moveCircuitZkey
    );

    const callArgs = [
      (latestBlockNumber - 31).toString(),
      latestBlockNumber.toString(),
      ...buildContractCallArgs(proofAndSignalData.proof, proofAndSignalData.publicSignals),
    ];

    console.log('callArgs', callArgs);

    this.optimisticSelfInfo = {
      x,
      y,
      blockhash: snarkInput.blockhash,
      salt: snarkInput.salt,
      commitment: snarkInput.commitment,
      address: this.account!,
      actionId,
    };

    return callArgs;
  }

  public async initPlayer(x: number, y: number) {
    const actionId = getRandomActionId();
    const txIntent: UnconfirmedInitPlayer = {
      actionId,
      methodName: ContractMethodName.INIT_PLAYER,
      callArgs: this.assembleInitSnarkInput(x, y, actionId),
    };
    this.onTxIntent(txIntent);
    this.contractsAPI.initPlayer(txIntent).catch((err) => {
      this.onTxIntentFail(txIntent, err);
    });
  }

  public async movePlayer(x: number, y: number) {
    const actionId = getRandomActionId();
    const txIntent: UnconfirmedMovePlayer = {
      actionId,
      methodName: ContractMethodName.MOVE_PLAYER,
      callArgs: this.assembleMoveSnarkInput(x, y, actionId),
    };
    this.onTxIntent(txIntent);
    this.contractsAPI.movePlayer(txIntent).catch((err) => {
      this.onTxIntentFail(txIntent, err);
    });
  }

  public getTiles() {
    // tiles are stale, refresh it
    for (let i = 0; i < this.GRID_UPPER_BOUND; i++) {
      for (let j = 0; j < this.GRID_UPPER_BOUND; j++) {
        const newMetas: CommitmentMetadata[] = [];
        for (const meta of this.tiles[i][j].metas) {
          const newMeta = this.commitmentToMetadata.get(meta.commitment)!;
          newMeta.blockNum = (this.latestEventBlockNum - parseInt(newMeta.blockNum)).toString();
          newMetas.push(newMeta);
        }
        this.tiles[i][j].metas = newMetas;
      }
    }
    return this.tiles;
  }

  public getSelfLoc() {
    return this.selfInfo;
  }

  public emitMine() {
    this.minedTilesUpdated$.publish();
  }

  public async getCurrentBlockNumber() {
    return await this.ethConnection.provider.getBlockNumber();
  }

  public async getBattlePower(player: EthAddress) {
    const powers = await this.contractsAPI.getBattlePower(player);
    const fixedPowers = powers.map((power) => {
      return BigInt(power) > power255()
        ? -parseInt(((power255() << 1n) - BigInt(power)).toString()) / 1e16
        : parseInt(BigInt(power).toString()) / 1e16;
    });
    return fixedPowers;
  }

  public async assembleBattleSnarkInput(player: EthAddress, actionId: string) {
    const latestCommitment = this.addressToLatestCommitment.get(player);
    const latestMinedCommitment = this.commitmentToMinedCommitment.get(latestCommitment!)!;
    const fullInput = {
      myX: this.selfInfo.x.toString(),
      myY: this.selfInfo.y.toString(),
      myBlockhash: this.selfInfo.blockhash,
      mySalt: this.selfInfo.salt,
      myCommitment: this.selfInfo.commitment,
      yourX: latestMinedCommitment.x.toString(),
      yourY: latestMinedCommitment.y.toString(),
      yourBlockhash: latestMinedCommitment.blockhash,
      yourSalt: latestMinedCommitment.salt,
      yourCommitment: latestMinedCommitment.commitment,
    };
    console.log('fullInput', fullInput);

    const proofAndSignalData = await this.snarkProverQueue.prove(
      fullInput,
      battleCircuitPath,
      battleCircuitZkey
    );

    const callArgs = [
      player,
      ...buildContractCallArgs(proofAndSignalData.proof, proofAndSignalData.publicSignals),
    ];

    console.log('callArgs', callArgs);

    return callArgs;
  }

  public async battlePlayer(player?: EthAddress) {
    if (!player) {
      console.warn('no player to battle');
      return;
    }
    const actionId = getRandomActionId();
    const txIntent: UnconfirmedBattlePlayer = {
      actionId,
      methodName: ContractMethodName.BATTLE_PLAYER,
      callArgs: this.assembleBattleSnarkInput(player, actionId),
    };
    this.onTxIntent(txIntent);
    this.contractsAPI.battlePlayer(txIntent).catch((err) => {
      this.onTxIntentFail(txIntent, err);
    });
  }

  public getAccount() {
    return this.account;
  }

  public fetchWins() {
    return this.contractsAPI.getWins(this.account!);
  }

  public getWins() {
    return this.selfWins;
  }

  public async claimTreasure(x: number, y: number) {
    const actionId = getRandomActionId();

    const txIntent: UnconfirmedClaimTreasure = {
      actionId,
      methodName: ContractMethodName.CLAIM_TREASURE,
      callArgs: Promise.resolve([
        x.toString(),
        y.toString(),
        this.selfInfo.blockhash,
        this.selfInfo.salt,
      ]),
    };
    this.onTxIntent(txIntent);
    this.contractsAPI.claimTreasure(txIntent).catch((err) => {
      this.onTxIntentFail(txIntent, err);
    });
  }
}

export default GameManager;
