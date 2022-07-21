import { ethers } from 'ethers';
import { keccak256, toUtf8Bytes } from 'ethers/lib/utils';
import type { Opaque } from 'type-fest';

import { mimcSponge, modPBigInt } from '@darkforest_eth/hashing';

export const tileTypeToColor: { [key: number]: string } = {
  0: '#ffac17',
  1: '#ffb83f',
  2: '#f27100',
  3: '#ffae5d',
  4: '#ff9915',
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

export enum TileType {
  UNKNOWN,
  WATER,
  SAND,
  TREE,
  STUMP,
  CHEST,
  FARM,
  WINDMILL,
  GRASS,
  SNOW,
  STONE,
  ICE,
  MAX = ICE,
}

export enum TemperatureType {
  COLD,
  NORMAL,
  HOT,
  MAX = HOT,
}

export enum AltitudeType {
  SEA,
  BEACH,
  LAND,
  MOUNTAIN,
  MOUNTAINTOP,
  MAX = MOUNTAINTOP,
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
  tileType: TileType;
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

/**
 * This is expected to be a 40-character, lowercase hex string, prefixed with 0x
 * (so 42 characters in total). EthAddress should only ever be instantiated
 * through the `address` function in `serde`.
 */
export type EthAddress = Opaque<string, 'EthAddress'>;

/**
 * Converts a string to an `EthAddress`: a 0x-prefixed all lowercase hex string
 * of 40 hex characters. An object of the `EthAddress` type should only ever be
 * initialized through this constructor-like method. Throws if the provided
 * string cannot be parsed as an Ethereum address.
 *
 * @param str An address-like `string`
 */
export function address(str: string): EthAddress {
  let ret = str.toLowerCase();
  if (ret.slice(0, 2) === '0x') {
    ret = ret.slice(2);
  }
  for (const c of ret) {
    if ('0123456789abcdef'.indexOf(c) === -1) throw new Error('not a valid address');
  }
  if (ret.length !== 40) throw new Error('not a valid address');
  return `0x${ret}` as EthAddress;
}

export function getCommitment(x: number, y: number, blockhash: string) {
  return mimcSponge([modPBigInt(x), modPBigInt(y), modPBigInt(Number(blockhash))], 1, 22, 123);
}
