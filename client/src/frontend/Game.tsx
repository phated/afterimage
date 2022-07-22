import React, { useEffect, useRef, useState } from 'react';
import styled from 'styled-components';
import GameManager from '../backend/GameManager';
import {
  DEV_TEST_PRIVATE_KEY,
  Tile,
  TileKnowledge,
  WorldCoords,
  MINED_COLOR,
  UNMINED_COLOR,
} from '../utils';
import { Tooltip, Text, Loading, Grid, Card } from '@nextui-org/react';
import { EthConnection } from '@zkgame/network';
import { getEthConnection } from '../backend/Blockchain';
import { PluginManager } from '../backend/PluginManager';
import { useSelfLoc, useTiles } from './Utils/AppHooks';
import { useParams } from 'react-router-dom';
import { getMaxListeners } from 'process';

const enum LoadingStep {
  NONE,
  LOADED_ETH_CONNECTION,
  LOADED_GAME_MANAGER,
  LOADED_PLUGIN_MANAGER,
}

export default function Game() {
  const { privKeyIdx } = useParams<{ privKeyIdx?: string }>();
  const privateKey = DEV_TEST_PRIVATE_KEY[privKeyIdx ? parseInt(privKeyIdx) : 0];

  const [gameManager, setGameManager] = useState<GameManager | undefined>();
  const [pluginManager, setPluginManager] = useState<PluginManager | undefined>();
  const [ethConnection, setEthConnection] = useState<EthConnection | undefined>();
  const [step, setStep] = useState(LoadingStep.NONE);
  const [error, setError] = useState('no errors');
  const tiles = useTiles(gameManager);
  const selfLoc = useSelfLoc(gameManager);

  useEffect(() => {
    getEthConnection()
      .then(async (ethConnection) => {
        ethConnection.setAccount(privateKey);
        setEthConnection(ethConnection);
        setStep(LoadingStep.LOADED_ETH_CONNECTION);
        const gm = await GameManager.create(ethConnection);
        window.gm = gm;
        setGameManager(gm);
        setStep(LoadingStep.LOADED_GAME_MANAGER);
        const pm = new PluginManager(gameManager!);
        window.pm = pm;
        setPluginManager(pm);
        setStep(LoadingStep.LOADED_PLUGIN_MANAGER);
      })
      .catch((e) => {
        console.log(e);
        setError(e.message);
      });
  }, []);

  useEffect(() => {
    if (gameManager) {
      gameManager.emitMine();
    }
    document.addEventListener('keydown', handleKeyDown);
    return function cleanup() {
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [gameManager]);

  const onGridClick = (
    event: React.MouseEvent<HTMLDivElement, MouseEvent>,
    coords: WorldCoords
  ) => {
    event.preventDefault();
    console.log('coords', coords);
    console.log('tile', tiles.value[coords.x][coords.y]);
  };

  const handleKeyDown = (event: KeyboardEvent) => {
    if (!gameManager) return;
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
    if (!gameManager.getSelfLoc()) return;

    const dx = keyToDirection[key][0] + gameManager.getSelfLoc().x;
    const dy = keyToDirection[key][1] + gameManager.getSelfLoc().y;
    gameManager.movePlayer(dx, dy);
  };

  return (
    <>
      {gameManager && tiles.value ? (
        <>
          <FullScreen>
            {tiles.value.map((coordRow, i) => {
              return (
                <GridRow key={i}>
                  {coordRow.map((tile, j) => {
                    // set color based on mining (and other things eventually)
                    const color =
                      tile.tileType == TileKnowledge.KNOWN ? MINED_COLOR : UNMINED_COLOR;

                    let style = { backgroundColor: color, backgroundImage: '' };
                    if (
                      selfLoc.value &&
                      selfLoc.value!.x == tile.coords.x &&
                      selfLoc.value!.y == tile.coords.y
                    ) {
                      style.backgroundImage = `url('./fremen.png')`;
                    }

                    // display other players if their shadows are known
                    if (selfLoc.value && tile.tileType == TileKnowledge.KNOWN) {
                      let otherMetas = tile.metas.filter(
                        (meta) => meta.address != selfLoc.value?.address
                      );
                      if (otherMetas.length > 0) {
                        style.backgroundImage = `url('./fremen_dark_5.png')`;
                      }
                    }

                    return (
                      <GridSquare
                        key={100 * i + j}
                        style={style}
                        onContextMenu={(event) => onGridClick(event, { x: i, y: j })}
                      />
                    );
                  })}
                </GridRow>
              );
            })}
            <button
              onClick={() => gameManager.startMining(selfLoc.value!.x, selfLoc.value!.y)}
              style={{ margin: '5px' }}
            >
              Mine
            </button>
            <button onClick={() => gameManager.initPlayer(5, 5)} style={{ margin: '5px' }}>
              Init
            </button>
          </FullScreen>
        </>
      ) : (
        <FullScreen>
          <Title>
            <Text h1 size={96} color='secondary'>
              defcon procgen workshop
            </Text>
          </Title>
          <SubTitle>
            <Text h2 size={64} color='secondary'>
              Loading
              <Loading type='points-opacity' size='lg' color='secondary' />
            </Text>
            {error != 'no errors' && (
              <Text h2 size={64} color='secondary'>
                {error}
              </Text>
            )}
          </SubTitle>
        </FullScreen>
      )}
    </>
  );
}

const GridRow = styled.div`
  display: flex;
  flex-direction: row;
  height: 30px;
  width: 100%;
`;

const GridSquare = styled.div`
  width: 30px;
  height: 100%;
  border-color: rgba(0, 0, 0, 0.15);
  border-style: solid;
  border-width: 1px;
  justify-content: center;
  vertical-align: middle;
  text-align: center;
  display: flex;
  align-items: center;
  justify-content: center;
`;

const FullScreen = styled.div`
  position: absolute;
  top: 0;
  left: 0;
  bottom: 0;
  right: 0;
  background-color: white;
  height: 100%;
  user-select: none;
`;

export const Title = styled.div`
  vertical-align: middle;
  margin: 0;
  position: absolute;
  top: 20%;
  left: 25%;
  user-select: none;
`;

export const SubTitle = styled.div`
  vertical-align: middle;
  margin: 0;
  position: absolute;
  top: 65%;
  right: 25%;
`;
