import { ethers } from 'ethers';
import { keccak256, toUtf8Bytes } from 'ethers/lib/utils';
import type { EthAddress } from '@projectsophon/types';
import { address } from '@projectsophon/serde';
import BigInt from 'big-integer';
import type { BigInteger } from 'big-integer';

import { mimcSponge, modPBigInt } from '@darkforest_eth/hashing';
import tinycolor from 'tinycolor2';

export const MINED_COLOR = '#f27100';
export const UNMINED_COLOR = tinycolor('#797979').desaturate(100).toHexString();
export const TREASURE_COLOR = '#FFD700';

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

export const nullAddress = address('0x0000000000000000000000000000000000000000');

export const generatePrivateKey = (entropy: string) => {
  const privateKey = keccak256(toUtf8Bytes(entropy));
  return privateKey;
};

const provider = new ethers.providers.InfuraProvider('mainnet', '661cfe1251ae47d2a6cd6d883750f357');

export const fetchENS = async (address: EthAddress) => {
  return provider.lookupAddress(address);
};

export const prettifyAddress = async (address: EthAddress) => {
  const ens = await fetchENS(address);
  console.log('ens', ens);
  if (ens) {
    return ens;
  }
  return address.slice(0, 6) + '...' + address.slice(-4);
};

export const distance = (a: WorldCoords, b: WorldCoords) => {
  return Math.abs(a.x - b.x) + Math.abs(a.y - b.y);
};

export const promiseWithTimeout = function <T>(
  promise: Promise<T>,
  ms: number,
  timeoutError = new Error('Promise timed out')
): Promise<T> {
  // create a promise that rejects in milliseconds
  const timeout = new Promise<never>((_, reject) => {
    setTimeout(() => {
      reject(timeoutError);
    }, ms);
  });

  // returns a race between timeout and the passed promise
  return Promise.race<T>([promise, timeout]);
};

export const DEV_TEST_PRIVATE_KEY = [
  '0x044C7963E9A89D4F8B64AB23E02E97B2E00DD57FCB60F316AC69B77135003AEF', // 0x1c0f0Af3262A7213E59Be7f1440282279D788335
  '0x523170AAE57904F24FFE1F61B7E4FF9E9A0CE7557987C2FC034EACB1C267B4AE', //
  '0x67195c963ff445314e667112ab22f4a7404bad7f9746564eb409b9bb8c6aed32', //
];

export enum TileKnowledge {
  UNKNOWN,
  KNOWN,
  MAX = KNOWN,
}

export type WorldCoords = {
  x: number;
  y: number;
};

export interface FuncABI {
  name: string;
  type: string;
  inputs: { name: string; type: string }[];
  stateMutability: string;
  payable: boolean;
  constant: any;
}

export type TileContractMetaData = {
  emoji: string;
  name: string;
  description: string;
  extendedAbi: FuncABI[];
};

export type Tile = {
  coords: WorldCoords;
  tileType: TileKnowledge;
  metas: CommitmentMetadata[];
};

export type PlayerInfo = {
  coords: WorldCoords;
  proxyAddress: EthAddress;
  realAddress: EthAddress;
  emoji: string;
  canMoveWater: boolean;
  canMoveSnow: boolean;
  canPutAnything: boolean;
};

export function getCommitment(x: number, y: number, blockhash: BigInteger, salt: number) {
  return mimcSponge([BigInt(x), BigInt(y), blockhash, BigInt(salt)], 1, 220, 123)[0];
}

export type RawCommitment = {
  x: number;
  y: number;
  blockhash: string;
  salt: string;
  commitment: string;
};

export type CommitmentInfo = RawCommitment & {
  address: EthAddress;
};

export type OptimisticCommitmentInfo = CommitmentInfo & {
  actionId: string;
};

export type CommitmentMetadata = {
  commitment: string;
  address: EthAddress;
  blockNum: string;
  isCurrent: boolean;
};

export function power255() {
  return BigInt(1).shiftLeft(255);
}

export function isTreasure(coords: WorldCoords) {
  return (
    mimcSponge([BigInt(coords.x), BigInt(coords.y)], 1, 220, 123)[0]
      .mod(BigInt(13))
      .toJSNumber() == 0
  );
}
