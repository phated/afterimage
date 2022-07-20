import { WorldCoords } from '../utils';

export const enum ContractEvent {
  TileUpdated = 'TileUpdated',
  PlayerUpdated = 'PlayerUpdated',
}

export enum ContractMethodName {
  MOVE_PLAYER = 'movePlayer',
  INIT_PLAYER_LOCATION = 'initPlayerLocation',
  OWN_TILE = 'ownTile',
}

export const enum ContractsAPIEvent {
  TileUpdated = 'TileUpdated',
  PlayerUpdated = 'PlayerUpdated',

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
  coords: WorldCoords;
};

export type SubmittedMovePlayer = UnconfirmedMovePlayer & SubmittedTx;

export function isUnconfirmedMovePlayer(txIntent: TxIntent): txIntent is UnconfirmedMovePlayer {
  return ContractMethodName.MOVE_PLAYER == txIntent.methodName;
}

export type UnconfirmedInitPlayer = TxIntent & {
  methodName: ContractMethodName.INIT_PLAYER_LOCATION;
  emoji: string;
};

export type SubmittedInitPlayer = UnconfirmedInitPlayer & SubmittedTx;

export function isUnconfirmedInitPlayer(txIntent: TxIntent): txIntent is UnconfirmedInitPlayer {
  return ContractMethodName.INIT_PLAYER_LOCATION == txIntent.methodName;
}