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
  for (let i = 0; i < 5 /*gridUpperBound ** 2*/; i++) {
    console.log(`mining (${curX}, ${curY})`);
    if (
      0 <= curX &&
      curX < gridUpperBound &&
      0 <= curY &&
      curY < gridUpperBound
    ) {
      const comm = getCommitment(curX, curY, blockhash);

      console.log(`commitment for (${curX},${curY}): ${comm}`);

      // TODO: send this to the game manager
    }

    // TODO: change curX, curY, below to be deltas from start position!
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

  // def spiral(X, Y):
  //     x = y = 0
  //     dx = 0
  //     dy = -1
  //     for i in range(max(X, Y)**2):
  //         if (-X/2 < x <= X/2) and (-Y/2 < y <= Y/2):
  //             print (x, y)
  //             # DO STUFF...
  //         if x == y or (x < 0 and x == -y) or (x > 0 and x == 1-y):
  //             dx, dy = -dy, dx
  //         x, y = x+dx, y+dy

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
