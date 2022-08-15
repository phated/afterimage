import FastQueue from 'fastq';
import * as Comlink from 'comlink';
import type { SnarkJSProofAndSignals } from '@projectsophon/snarkjs-helpers';

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

type SnarkInput = InitSnarkInput | MoveSnarkInput | BattleSnarkInput;

type ZKPTask = {
  taskId: number;
  input: SnarkInput;
  circuit: string; // path
  zkey: string; // path
};

export class SnarkProverQueue {
  #taskQueue: FastQueue.queueAsPromised<ZKPTask, SnarkJSProofAndSignals>;
  #taskCount: number;
  #snarkjs: Comlink.Remote<{
    groth16: {
      fullProve: (input: SnarkInput, circuit: string, zkey: string) => SnarkJSProofAndSignals;
    } & Comlink.ProxyMarked;
  }>;

  constructor() {
    this.#taskQueue = FastQueue.promise(this, this.execute, 1);
    this.#taskCount = 0;
    this.#snarkjs = Comlink.wrap(new Worker(new URL('/snarkjs.worker.js', import.meta.url)));
  }

  prove(input: SnarkInput, circuit: string, zkey: string): Promise<SnarkJSProofAndSignals> {
    const taskId = this.#taskCount++;
    const task = {
      input,
      circuit,
      zkey,
      taskId,
    };

    return this.#taskQueue.push(task);
  }

  async execute(task: ZKPTask): Promise<SnarkJSProofAndSignals> {
    try {
      console.log(`proving ${task.taskId}`);
      const res = await this.#snarkjs.groth16.fullProve(task.input, task.circuit, task.zkey);
      console.log(`proved ${task.taskId}`);
      return res;
    } catch (e) {
      console.error('error while calculating SNARK proof:');
      console.error(e);
      throw e;
    }
  }
}
