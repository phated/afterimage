<script lang="ts" context="module">
  import { ContractManager } from "@darkforest_eth/network/dist/ContractManager";
  import type { ZKGame } from "@zkgame/typechain";
  import type { providers, Wallet } from "ethers";
  import { Contract } from "ethers";
  import { connection } from "./Connection.svelte";

  export const contracts = new ContractManager(connection);

  export async function zkgameLoader(
    address: string,
    provider: providers.JsonRpcProvider,
    signer: Wallet | undefined
  ): Promise<ZKGame> {
    const { default: abi } = await import("@zkgame/contracts/ZKGame.json");
    return new Contract(address, abi, signer ?? provider) as ZKGame;
  }
</script>
