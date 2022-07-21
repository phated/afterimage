import { getCommitment, WorldCoords } from "../utils";

/* eslint-disable @typescript-eslint/no-explicit-any */
const ctx: Worker = self as any;
/* eslint-enable @typescript-eslint/no-explicit-any */

function startMining(
  gridUpperBound: number,
  startPos: WorldCoords,
  blockhash: string
) {
  let curX = startPos.x;
  let curY = startPos.y;
  let dx = 0;
  let dy = -1;

  // TODO: why does this not work???
  for (let i = 0; i < 5 /*gridUpperBound ** 2*/; i++) {
    console.log(`mining (${curX}, ${curY})`);
    if (
      0 <= curX &&
      curX < gridUpperBound &&
      0 <= curY &&
      curY < gridUpperBound
    ) {
      const comm = getCommitment(curX, curY, blockhash);

      postMessage({
        type: "mined",
        coords: { x: curX, y: curY },
        commitment: comm,
      });
    }

    let relX = curX - startPos.x;
    let relY = curY - startPos.y;
    console.log(`relative coords: (${relX}, ${relY})`);
    if (
      relX == relY ||
      (relX < 0 && relX == -relY) ||
      (relX > 0 && relX == gridUpperBound - relY)
    ) {
      // change direction
      [dx, dy] = [-dy, dx];
      console.log(dx, dy);
    }

    curX += dx;
    curY += dy;
  }

  ctx.postMessage({
    type: "start",
    pos: startPos,
    blockhash,
  });
}

ctx.addEventListener("message", (e: MessageEvent) => {
  switch (e.data.type) {
    case "start": {
      console.log(e.data);
      startMining(e.data.gridUpperBound, e.data.startPos, e.data.blockhash);
      break;
    }

    // TODO: terminate?
  }
});
