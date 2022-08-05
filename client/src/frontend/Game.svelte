<script lang="ts">
  import tinycolor from "tinycolor2";
  import type { WorldCoords, TileType, Tile } from "../utils";
  import { DEV_TEST_PRIVATE_KEY, tileTypeToColor } from "../utils";
  import Page from "./Page.svelte";
  import GridRow from "./GridRow.svelte";
  import GridSquare from "./GridSquare.svelte";
  import FullScreen from "./FullScreen.svelte";
  import Title from "./Title.svelte";
  import SubTitle from "./SubTitle.svelte";

  import { contracts, zkgameLoader } from "../backend/Contracts.svelte";
  import { CONTRACT_ADDRESS } from "@zkgame/contracts";
  import { connection } from "../backend/Connection.svelte";

  const enum LoadingStep {
    NONE,
    LOADED_ETH_CONNECTION,
    LOADED_GAME_MANAGER,
    LOADED_PLUGIN_MANAGER,
  }

  let error = "no errors";
  let tiles: Tile[][] = [];

  //   useContractListener(client, 'PlayerUpdated', (player, commitment) => {
  //     console.log("player updated", player, commitment);
  //   });

  //   useContractListener(client, "Pong", (value) => {
  //     console.log("pong event", value.toNumber());
  //   });

  function dist(a: WorldCoords, b: WorldCoords) {
    return Math.sqrt(Math.pow(a.x - b.x, 2) + Math.pow(a.y - b.y, 2));
  }

  function getBackgroundColor(tileType: TileType, coords: WorldCoords) {
    const lightRadius = 10;
    const center = { x: 50, y: 50 };
    const baseColor = tinycolor(tileTypeToColor[tileType]);

    let color = baseColor.clone();
    if (dist(center, coords) > lightRadius) {
      color = baseColor.desaturate(100);
    } else {
      // TODO: simulate flicker/blocks falling behind
      const r = Math.random();
      if (r < 0.1) {
        color = baseColor.desaturate(r * 400);
      }
    }

    return color.toHexString();
  }

  const onGridClick = (coords: WorldCoords) => {
    console.log("coords", coords);
    console.log("tile", tiles[coords.x][coords.y]);
  };
</script>

<Page>
  {#await $contracts.loadContract(CONTRACT_ADDRESS, zkgameLoader)}
    <div>Loading contract...</div>
    {console.log("loading contract")}
  {:then contract}
    {(window.contract = contract)};
    {console.log("contract loaded")}
    {#if !connection.privateKey}
      {console.log("setting private key")}
      {(connection.privateKey = DEV_TEST_PRIVATE_KEY[0])}
    {/if}
  {/await}
  {#if tiles.length}
    <FullScreen>
      {#each tiles as coordRow, i}
        {#if i !== 0}
          <GridRow>
            {#each coordRow as tile, j}
              {#if j !== 0}
                <GridSquare
                  --square-color={getBackgroundColor(tile.tileType, {
                    x: i,
                    y: j,
                  })}
                  on:contextmenu={() => onGridClick({ x: i, y: j })}
                />
              {/if}
            {/each}
          </GridRow>
        {/if}
      {/each}
    </FullScreen>
  {:else}
    <FullScreen>
      <Title>
        <h1>defcon procgen workshop</h1>
      </Title>
      <SubTitle>
        <h2>Loading</h2>
        {#if error !== "no errors"}
          <h2>
            {error}
          </h2>
        {/if}
      </SubTitle>
    </FullScreen>
  {/if}
</Page>
