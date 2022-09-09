import ZKGameContractAbi from '@zkgame/contracts/ZKGame.json';
import type { ZKGame } from '@zkgame/typechain';
import { createContract, ConnectionManager } from '@projectsophon/network';
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

export function getEthConnection(): ConnectionManager {
  return new ConnectionManager(import.meta.env.RPC_URL);
}
