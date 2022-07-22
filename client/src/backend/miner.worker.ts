import { getCommitment, WorldCoords } from '../utils';
import BigInt, { BigInteger } from 'big-integer';
import { modPBigIntNative } from '@darkforest_eth/hashing';

/* eslint-disable @typescript-eslint/no-explicit-any */
const ctx: Worker = self as any;
/* eslint-enable @typescript-eslint/no-explicit-any */

function startMining(
  gridUpperBound: number,
  saltUpperBound: number,
  startX: number,
  startY: number,
  blockhashes: string[]
) {
  let curX = 0;
  let curY = 0;
  let dx = 0;
  let dy = -1;
  for (var i = 0; i < gridUpperBound / 2; i++) {
    if (
      -gridUpperBound / 2 < curX &&
      curX <= gridUpperBound / 2 &&
      -gridUpperBound / 2 < curY &&
      curY <= gridUpperBound / 2
    ) {
      console.log('coorddd', curX, curY);

      const realX = curX + startX;
      const realY = curY + startY;
      const allCommits = [];
      for (var potBlockhash of blockhashes) {
        for (var potSalt = 0; potSalt < saltUpperBound; potSalt++) {
          console.log(
            'hash out',
            potBlockhash,
            modPBigIntNative(BigInt(potBlockhash.slice(2), 16))
          );
          const commit = getCommitment(
            realX,
            realY,
            modPBigIntNative(BigInt(potBlockhash.slice(2), 16)),
            potSalt
          );
          console.log(
            `dump-${realX}-${realY}-${modPBigIntNative(
              BigInt(potBlockhash.slice(2), 16)
            )}-${potSalt}-${commit}`
          );
          allCommits.push({
            x: realX,
            y: realY,
            blockhash: modPBigIntNative(BigInt(potBlockhash.slice(2), 16)).toString(),
            salt: potSalt,
            commitment: commit.toString(),
          });
        }
      }

      postMessage({
        type: 'mined',
        commits: allCommits,
      });
    }
    if (curX == curY || (curX < 0 && curX == -curY) || (curX > 0 && curX == 1 - curY)) {
      let temp = dx;
      dx = -dy;
      dy = temp;
    }
    curX += dx;
    curY += dy;
  }
}

ctx.addEventListener('message', (e: MessageEvent) => {
  switch (e.data.type) {
    case 'start': {
      console.log(e.data);
      startMining(
        e.data.gridUpperBound,
        e.data.saltUpperBound,
        e.data.x,
        e.data.y,
        e.data.blockhashes
      );
      break;
    }
  }
});
