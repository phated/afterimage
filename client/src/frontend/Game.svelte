<script lang="ts">
  import FullScreen from './components/FullScreen.svelte';
  import GridRow from './components/GridRow.svelte';
  import GridSquare from './components/GridSquare.svelte';
  import Title from './components/Title.svelte';
  import SubTitle from './components/SubTitle.svelte';

  import {
    DEV_TEST_PRIVATE_KEY,
    TileKnowledge,
    type WorldCoords,
    MINED_COLOR,
    UNMINED_COLOR,
    TREASURE_COLOR,
    isTreasure,
    type Tile,
    type CommitmentInfo,
  } from '../utils';
  import { onMount } from 'svelte';
  import type { EthAddress } from '@projectsophon/types';
  import { getEthConnection } from '../backend/Blockchain';
  import GameManager from '../backend/GameManager';
  import { PluginManager } from '../backend/PluginManager';

  const enum LoadingStep {
    NONE,
    LOADED_ETH_CONNECTION,
    LOADED_GAME_MANAGER,
    LOADED_PLUGIN_MANAGER,
  }

  let currentEnemy: EthAddress | undefined = undefined;
  let selfLoc: CommitmentInfo | undefined = undefined;

  let tiles: Tile[][] | undefined = undefined;

  let wins = 0;

  let error = 'no errors';

  let canvas: HTMLCanvasElement | undefined;

  const url = new URL(window.location.href);
  const privKeyIdx = url.searchParams.get('privKeyIdx');
  const privateKey = DEV_TEST_PRIVATE_KEY[privKeyIdx ? parseInt(privKeyIdx, 10) : 0];

  const ethConnection = getEthConnection();

  ethConnection.privateKey = privateKey;

  let gameManager: GameManager | undefined = undefined;
  let pluginManager: PluginManager | undefined = undefined;

  let step = LoadingStep.LOADED_ETH_CONNECTION;

  function handleKeyDown(event: KeyboardEvent) {
    const eve = event.target as HTMLElement;
    const key = event.key.toLowerCase();

    console.debug('Key event', key);
    const keyToDirection: any = {
      w: [-1, 0],
      a: [0, -1],
      s: [1, 0],
      d: [0, 1],
    };

    if (!(key in keyToDirection)) return;
    if (!gameManager?.getSelfLoc()) return;

    const dx = keyToDirection[key][0] + gameManager.getSelfLoc().x;
    const dy = keyToDirection[key][1] + gameManager.getSelfLoc().y;
    gameManager.movePlayer(dx, dy);
  }

  function onGridClick(coords: WorldCoords) {
    console.log('coords', coords);
    if (!tiles) {
      console.warn('no tiles, skipping click');
      return;
    }
    console.log('tile', tiles[coords.x][coords.y]);
    if (tiles[coords.x][coords.y].metas.length > 0) {
      currentEnemy = tiles[coords.x][coords.y].metas[0].address;
    } else if (isTreasure(coords)) {
      gameManager?.claimTreasure(coords.x, coords.y);
    }
  }

  // set color based on mining (and other things eventually)
  function getBackgroundColor(tile: Tile, coords: WorldCoords) {
    if (tile.tileType == TileKnowledge.KNOWN) {
      return MINED_COLOR;
    }
    if (isTreasure(coords)) {
      return TREASURE_COLOR;
    }

    return UNMINED_COLOR;
  }

  function getBackgroundImage(tile: Tile, selfLoc?: CommitmentInfo) {
    let backgroundImage;

    if (selfLoc && selfLoc.x == tile.coords.x && selfLoc.y == tile.coords.y) {
      backgroundImage = `url('./fremen.png')`;
    } else if (selfLoc && tile.tileType == TileKnowledge.KNOWN) {
      let otherMetas = tile.metas.filter((meta) => meta.address != selfLoc.address);
      if (otherMetas.length > 0) {
        const topMeta = otherMetas[otherMetas.length - 1];
        if (topMeta.isCurrent) {
          backgroundImage = `url('./fremen_dark_1.png')`;
        } else {
          if (parseInt(topMeta.blockNum) > 60) {
            backgroundImage = `url('./fremen_dark_5.png')`;
          } else if (parseInt(topMeta.blockNum) > 30) {
            backgroundImage = `url('./fremen_dark_4.png')`;
          } else if (parseInt(topMeta.blockNum) > 10) {
            backgroundImage = `url('./fremen_dark_3.png')`;
          } else {
            backgroundImage = `url('./fremen_dark_2.png')`;
          }
        }
      }
    }

    // display other players if their shadows are known
    if (selfLoc && tile.tileType == TileKnowledge.KNOWN) {
      let otherMetas = tile.metas.filter((meta) => meta.address != selfLoc.address);
      if (otherMetas.length > 0) {
        const topMeta = otherMetas[otherMetas.length - 1];
        if (topMeta.isCurrent) {
          backgroundImage = `url('./fremen_dark_1.png')`;
        } else {
          if (parseInt(topMeta.blockNum) > 60) {
            backgroundImage = `url('./fremen_dark_5.png')`;
          } else if (parseInt(topMeta.blockNum) > 30) {
            backgroundImage = `url('./fremen_dark_4.png')`;
          } else if (parseInt(topMeta.blockNum) > 10) {
            backgroundImage = `url('./fremen_dark_3.png')`;
          } else {
            backgroundImage = `url('./fremen_dark_2.png')`;
          }
        }
      }
    }

    return backgroundImage;
  }

  async function drawer() {
    console.log('canvasRef', canvas, gameManager, currentEnemy);
    if (!canvas || !gameManager || !currentEnemy) return;

    console.log('start drawing');

    const myPower = await gameManager.getBattlePower(gameManager.getAccount()!);
    const enemyPower = await gameManager.getBattlePower(currentEnemy!);

    const drawingCtx = canvas.getContext('2d');
    if (!drawingCtx) {
      throw new Error('Failed to get drawing context');
    }
    const width = canvas.width;
    const height = canvas.height;
    drawingCtx.clearRect(0, 0, canvas.width, canvas.height);
    console.log('width', width, 'height', height);
    drawingCtx.strokeStyle = 'gainsboro';
    drawingCtx.beginPath();
    drawingCtx.moveTo(0, height / 2);
    drawingCtx.lineTo(width, height / 2);
    drawingCtx.stroke();
    // Draw the waveform.
    drawingCtx.strokeStyle = 'blue';
    drawingCtx.beginPath();
    const myValues = [];

    function myGenFn(t: number) {
      // console.log('t', t, Math.sin(t) * 10);
      return myPower[t];
    }
    console.log('myPower', myPower);

    for (let i = 0; i < width; i++) {
      const value = myGenFn(i / 5);
      myValues.push(value);
    }
    for (let i = 0; i < width; i++) {
      const value = myValues[i] / 125;
      const y = height - Math.floor((value / 2 + 0.5) * height * 0.9 + height * 0.05);
      if (i == 0) {
        drawingCtx.moveTo(i, y);
      } else {
        drawingCtx.lineTo(i, y);
      }
    }
    drawingCtx.stroke();

    if (!currentEnemy) return;
    drawingCtx.strokeStyle = 'gainsboro';
    drawingCtx.beginPath();
    drawingCtx.moveTo(0, height / 2);
    drawingCtx.lineTo(width, height / 2);
    drawingCtx.stroke();
    // Draw the waveform.
    drawingCtx.strokeStyle = 'red';
    drawingCtx.beginPath();
    const yourValues = [];

    function yourGenFn(t: number) {
      // console.log('t', t, Math.sin(t) * 10);
      return enemyPower[t];
    }
    console.log('enemyPower', enemyPower);

    for (let i = 0; i < width; i++) {
      const value = yourGenFn(i / 5);
      yourValues.push(value);
    }
    for (let i = 0; i < width; i++) {
      const value = yourValues[i] / 125;
      const y = height - Math.floor((value / 2 + 0.5) * height * 0.9 + height * 0.05);
      if (i == 0) {
        drawingCtx.moveTo(i, y);
      } else {
        drawingCtx.lineTo(i, y);
      }
    }
    drawingCtx.stroke();
  }

  onMount(drawer);

  onMount(() => {
    // TODO: Deal with this weird promise junk
    GameManager.create(ethConnection)
      .then((gm) => {
        window.gm = gm;
        gameManager = gm;
        step = LoadingStep.LOADED_GAME_MANAGER;
        pluginManager = new PluginManager(gameManager);
        window.pm = pluginManager;
        step = LoadingStep.LOADED_PLUGIN_MANAGER;
        gameManager.emitMine();
        tiles = gameManager.getTiles();

        gameManager.minedTilesUpdated$.subscribe(() => {
          if (gameManager) {
            selfLoc = gameManager.getSelfLoc();
            tiles = gameManager.getTiles();
          }
        });
        gameManager.playerUpdated$.subscribe(() => {
          if (gameManager) {
            selfLoc = gameManager.getSelfLoc();
          }
        });
        gameManager.battleUpdated$.subscribe(() => {
          if (gameManager) {
            wins = gameManager.getWins();
          }
        });
      })
      .catch((e) => {
        console.error(e);
        error = e.message;
      });
  });
</script>

<svelte:window on:keydown={handleKeyDown} />

<FullScreen>
  {#if tiles}
    {#each tiles as coordRow, i}
      <GridRow>
        {#each coordRow as tile, j}
          <GridSquare
            backgroundColor={getBackgroundColor(tile, { x: i, y: j })}
            backgroundImage={getBackgroundImage(tile, selfLoc)}
            on:contextmenu={() => onGridClick({ x: i, y: j })}
          />
        {/each}
      </GridRow>
    {/each}
    <button on:click={() => gameManager?.startMining(selfLoc)} style:margin="5px"> Mine </button>
    <button
      on:click={() => gameManager?.initPlayer(5, 5 + (privKeyIdx ? parseInt(privKeyIdx, 10) : 0))}
      style:margin="5px"
    >
      Init
    </button>
    <button on:click={() => gameManager?.battlePlayer(currentEnemy)} style:margin="5px">
      Battle
    </button>
    <button on:click={() => drawer()} style:margin="5px"> Redraw </button>
    <div style:margin="5px">Wins: {wins}</div>
    <canvas
      id="myCanvas"
      bind:this={canvas}
      style:border="1px solid #000000"
      style:height="80px"
      style:width="400px"
    />
  {:else}
    <Title>
      <h1 style:font-size="96px" style:color="#9750DD">defcon procgen workshop</h1>
    </Title>
    <SubTitle>
      <h2 style:font-size="64px" style:color="#9750DD">Loading...</h2>
      {#if error != 'no errors'}
        <h2 style:font-size="64px" style:color="#9750DD">{error}</h2>
      {/if}
    </SubTitle>
  {/if}
</FullScreen>
