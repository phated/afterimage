import FastQueue from 'fastq';
import type { SnarkJSProofAndSignals } from '@zkgame/snarks';

interface InitSnarkInput {
  x: string;
  y: string;
  blockhash: string;
  possibleHashes: string[];
  possibleHashesHash: string;
  salt: string;
  saltUpperBound: string;
  gridUpperBound: string;
  commitment: string;
}

interface MoveSnarkInput {
  oldX: string;
  oldY: string;
  oldSalt: string;
  oldCommitment: string;
  newX: string;
  newY: string;
  newBlockhash: string;
  possibleHashes: string[];
  possibleHashesHash: string;
  newSalt: string;
  saltUpperBound: string;
  gridUpperBound: string;
  newCommitment: string;
}

interface BattleSnarkInput {
  myX: string;
  myY: string;
  mySalt: string;
  myCommitment: string;
  yourX: string;
  yourY: string;
  yourSalt: string;
  yourCommitment: string;
}

type ZKPTask = {
  taskId: number;
  input: unknown;
  circuit: string; // path
  zkey: string; // path

  onSuccess: (proof: SnarkJSProofAndSignals) => void;
  onError: (e: Error) => void;
};

type SnarkInput = InitSnarkInput | MoveSnarkInput | BattleSnarkInput;

export class SnarkProverQueue {
  private taskQueue: FastQueue.queue;
  private taskCount: number;

  constructor() {
    this.taskQueue = FastQueue(this.execute.bind(this), 1);
    this.taskCount = 0;
  }

  public doProof(
    input: SnarkInput,
    circuit: string,
    zkey: string
  ): Promise<SnarkJSProofAndSignals> {
    const taskId = this.taskCount++;
    const task = {
      input,
      circuit,
      zkey,
      taskId,
    };

    return new Promise<SnarkJSProofAndSignals>((resolve, reject) => {
      this.taskQueue.push(task, (err, result) => {
        if (err) {
          reject(err);
        } else {
          resolve(result);
        }
      });
    });
  }

  private async execute(
    task: ZKPTask,
    cb: (err: Error | null, result: SnarkJSProofAndSignals | null) => void
  ) {
    try {
      console.log(`proving ${task.taskId}`);
      const res = await window.snarkjs.groth16.fullProve(task.input, task.circuit, task.zkey);
      console.log(`proved ${task.taskId}`);
      cb(null, res);
    } catch (e) {
      console.error('error while calculating SNARK proof:');
      console.error(e);
      cb(e as Error, null);
    }
  }
}
