import { ethers } from 'ethers';
import { keccak256, toUtf8Bytes } from 'ethers/lib/utils';


export const tileTypeToColor: { [key: number]: string } = {
  0: "#ffac17",
  1: "#ffb83f",
  2: "#f27100",
  3: "#ffae5d",
  4: "#ff9915",
};

// NOTE: eventually defined based on player/contract seed, perlin noise (for tile type) etc.
export function buildMap(width: number = 100, height: number = 100) {
  const rows = [];
  for (let i = 0; i < height; i++) {
    const row = [];
    for (let j = 0; j < width; j++) {
      row.push({ y: i, x: j, tileType: 2 });
    }

    rows.push(row);
  }
  return rows;
}

export const getRandomActionId = () => {
  const hex = '0123456789abcdef';

  let ret = '';
  for (let i = 0; i < 10; i += 1) {
    ret += hex[Math.floor(hex.length * Math.random())];
  }
  return ret;
};

export const DEV_TEST_PRIVATE_KEY = [
  '0x044C7963E9A89D4F8B64AB23E02E97B2E00DD57FCB60F316AC69B77135003AEF', // 0x1c0f0Af3262A7213E59Be7f1440282279D788335
  '0x523170AAE57904F24FFE1F61B7E4FF9E9A0CE7557987C2FC034EACB1C267B4AE', //
  '0x67195c963ff445314e667112ab22f4a7404bad7f9746564eb409b9bb8c6aed32', //
];

