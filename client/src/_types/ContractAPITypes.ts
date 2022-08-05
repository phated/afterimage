export const enum ContractsAPIEvent {
  TxInitFailed = "TxInitFailed",
  TxSubmitted = "TxSubmitted",
  TxConfirmed = "TxConfirmed",
  TxReverted = "TxReverted",
}

export type TxIntent = {
  // we generate a txId so we can reference the tx
  // before it is submitted to chain and given a txHash
  actionId: string;
  methodName: string;
};

export type SubmittedTx = TxIntent & {
  txHash: string;
  sentAtTimestamp: number;
};
