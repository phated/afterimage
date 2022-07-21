import { WorldCoords } from "../utils";
import GameManager from "./GameManager";

function defaultWorker() {
  return new Worker(new URL("./miner.worker.ts", import.meta.url));
}

export class MinerManager {
  private miner: Worker;

  private isExploring = false;

  private constructor() {
    this.isExploring = true;
  }

  static create(gridUpperBound: number): MinerManager {
    // miner worker should be a thing that knows which tiles are already discovered
    // and the bounds
    // does it need to know that a player event matches a hash it finds? *no*
    // what happens when it ends? i think it just silently stops
    // whenever it finds a hash, it should tell the GameManager about it
    let mm = new MinerManager();

    return mm;
  }

  // TODO: in the future, you'd want to know which coords have already been seen! Can pass in as an arg
  public startMining(
    gridUpperBound: number,
    startPos: WorldCoords,
    blockhash: String,
    onMined: (coords: WorldCoords, commitment: bigInt.BigInteger) => void
  ) {
    this.miner = defaultWorker();

    this.miner.postMessage({
      type: "start",
      startPos,
      gridUpperBound,
      blockhash,
    });

    this.miner.onmessage = (e: MessageEvent) => {
      console.log("received message:", e.data);
      onMined(e.data.coords, e.data.commitment);
    };
  }

  // NOTE: for debugging
  public stopMining() {
    this.miner.terminate();
  }
}
