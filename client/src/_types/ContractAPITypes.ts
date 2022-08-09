export enum ContractEvent {
  BattleUpdated = 'BattleUpdated',
  PlayerUpdated = 'PlayerUpdated',
}

export enum ContractMethodName {
  MOVE_PLAYER = 'movePlayer',
  INIT_PLAYER = 'initPlayer',
  BATTLE_PLAYER = 'battlePlayer',
  CLAIM_TREASURE = 'claimTreasure',
}

export enum ContractsAPIEvent {
  PlayerUpdated = 'PlayerUpdated',
  BattleUpdated = 'BattleUpdated',

  TxInitFailed = 'TxInitFailed',
  TxSubmitted = 'TxSubmitted',
  TxConfirmed = 'TxConfirmed',
  TxReverted = 'TxReverted',
}

export type TxIntent = {
  // we generate a txId so we can reference the tx
  // before it is submitted to chain and given a txHash
  actionId: string;
  methodName: ContractMethodName | string;
};

export type SubmittedTx = TxIntent & {
  txHash: string;
  sentAtTimestamp: number;
};

export type UnconfirmedMovePlayer = TxIntent & {
  methodName: ContractMethodName.MOVE_PLAYER;
  callArgs: Promise<unknown[]>;
};

export type SubmittedMovePlayer = UnconfirmedMovePlayer & SubmittedTx;

export function isUnconfirmedMovePlayer(txIntent: TxIntent): txIntent is UnconfirmedMovePlayer {
  return ContractMethodName.MOVE_PLAYER == txIntent.methodName;
}

export type UnconfirmedInitPlayer = TxIntent & {
  methodName: ContractMethodName.INIT_PLAYER;
  callArgs: Promise<unknown[]>;
};

export type SubmittedInitPlayer = UnconfirmedInitPlayer & SubmittedTx;

export function isUnconfirmedInitPlayer(txIntent: TxIntent): txIntent is UnconfirmedInitPlayer {
  return ContractMethodName.INIT_PLAYER == txIntent.methodName;
}

export type UnconfirmedBattlePlayer = TxIntent & {
  methodName: ContractMethodName.BATTLE_PLAYER;
  callArgs: Promise<unknown[]>;
};

export type SubmittedBattlePlayer = UnconfirmedBattlePlayer & SubmittedTx;

export function isUnconfirmedBattlePlayer(txIntent: TxIntent): txIntent is UnconfirmedBattlePlayer {
  return ContractMethodName.BATTLE_PLAYER == txIntent.methodName;
}

export type UnconfirmedClaimTreasure = TxIntent & {
  methodName: ContractMethodName.CLAIM_TREASURE;
  callArgs: Promise<unknown[]>;
};

export type SubmittedClaimTreasure = UnconfirmedClaimTreasure & SubmittedTx;

export function isUnconfirmedClaimTreasure(
  txIntent: TxIntent
): txIntent is UnconfirmedClaimTreasure {
  return ContractMethodName.CLAIM_TREASURE == txIntent.methodName;
}
