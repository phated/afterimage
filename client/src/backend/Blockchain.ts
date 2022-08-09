import ZKGameContractAbi from '@zkgame/contracts/ZKGame.json';
import type { ZKGame } from '@zkgame/typechain';
import { createContract, createEthConnection, EthConnection } from '@zkgame/network';
import type { providers, Wallet } from 'ethers';

/**
 * Loads the Core game contract, which is responsible for updating the state of the game.
 * @see https://github.com/darkforest-eth/eth/blob/master/contracts/DarkForestCore.sol
 */
export async function loadCoreContract(
  address: string,
  provider: providers.JsonRpcProvider,
  signer?: Wallet
): Promise<ZKGame> {
  return createContract<ZKGame>(address, ZKGameContractAbi, provider, signer);
}

export function getEthConnection(): Promise<EthConnection> {
  const isProd = import.meta.env.MODE === 'production';
  const defaultUrl = import.meta.env.VITE_DEFAULT_RPC;

  let url: string;

  if (isProd) {
    url = defaultUrl;
  } else {
    url = 'http://localhost:8545';
  }

  return createEthConnection(url);
}
