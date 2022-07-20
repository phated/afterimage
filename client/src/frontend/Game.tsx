import React, { useEffect, useRef, useState } from 'react';
import styled from 'styled-components';
import tinycolor from 'tinycolor2';
import { CONTRACT_ADDRESS } from '@zkgame/contracts';
import GameManager from '../backend/GameManager';
import { EthConnection } from '@darkforest_eth/network';
import { getEthConnection } from '../backend/Blockchain';
import {
  buildMap,
  DEV_TEST_PRIVATE_KEY,
} from '../utils';
import { useInfo, useInitted, useTiles } from './Utils/AppHooks';
import { useLocation, useParams } from 'react-router-dom';
import { TransformWrapper, TransformComponent } from 'react-zoom-pan-pinch';
import { Tooltip, Text, Loading, Grid, Card } from '@nextui-org/react';
import Draggable from 'react-draggable';
import { Pane, SettingsPane } from './Pane';
import { PluginManager } from '../backend/PluginManager';
import { SubTitle, Title } from './StyledComps';

const enum LoadingStep {
  NONE,
  LOADED_ETH_CONNECTION,
  LOADED_GAME_MANAGER,
  LOADED_PLUGIN_MANAGER,
}

interface stateType {
  proxyPrivKey: string;
  character: string;
}

export default function Game() {
  const location = useLocation<stateType>();
  const [gameManager, setGameManager] = useState<GameManager | undefined>();
  const [pluginManager, setPluginManager] = useState<PluginManager | undefined>();
  const [ethConnection, setEthConnection] = useState<EthConnection | undefined>();
  const [step, setStep] = useState(LoadingStep.NONE);
  const [error, setError] = useState('no errors');

  // NOTE: eventually initialize based on seed, etc.
  const tiles = buildMap();

  const playerInfos = useInfo(gameManager);
  const initted = useInitted(gameManager);
  const passedPrivateKey = location.state?.proxyPrivKey;
  const nuxCharacter: string = location.state?.character;
  const privateKey = passedPrivateKey;
  
  const [moveQueue, setMoveQueue] = useState<[number, number][]>([]);
  const currentMove = useRef('');

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

  const handleKeyDown = (event: KeyboardEvent) => {
    if (!gameManager) return;
    const eve = event.target as HTMLElement;
    if (eve.tagName.toLowerCase() !== 'body') return;
    const key = event.key.toLowerCase();

    console.debug('Key event', key);
    const keyToDirection: any = {
      w: [-1, 0],
      a: [0, -1],
      s: [1, 0],
      d: [0, 1],
    };

    if (!(key in keyToDirection)) return;
    setMoveQueue((x) => [...x, keyToDirection[key]]);
  };

   useEffect(() => {
    console.log('moveQueue', moveQueue);
    if (!gameManager) return;
    if (moveQueue.length === 0) return;
    if (currentMove.current === '' || gameManager.resolvedMoves.includes(currentMove.current)) {
      const push = async () => {
        const selfInfo = await gameManager.getSelfInfo();
        const location = selfInfo.coords;
        console.log('location', location);
        console.log('moveQueue', moveQueue[0]);
        const coords: WorldCoords = {
          x: location.x + moveQueue[0][0],
          y: location.y + moveQueue[0][1],
        };
        console.log('coords', coords);

        const motionConditionMessage = canMove(coords, selfInfo);
        if (motionConditionMessage !== '') {
          setMotionMessage([selfInfo.coords, motionConditionMessage]);
        } else {
          setMotionMessage([selfInfo.coords, getRandomMotionMessage()]);
          const moveId = await gameManager.movePlayer(coords);
          currentMove.current = moveId;
        }
        setMoveQueue((x) => x.slice(1));
      };
      push();
    }
  }, [moveQueue, playerInfos]);

  useEffect(() => {
    if (!gameManager) return;
    const swapMessage = async () => {
      const coords = (await gameManager.getSelfInfo()).coords;
      console.log('swapMessage coords', coords);
      if (coords.x !== motionMessage[0].x || coords.y !== motionMessage[0].y) {
        setMotionMessage([coords, '']);
      }
    };
    swapMessage();
  }, [playerInfos]);

  useEffect(() => {
    if (gameManager && nuxCharacter && !initted.value) {
      gameManager.initPlayerLocation(nuxCharacter);
    }
    if (gameManager) {
      gameManager.tileUpdated$.publish();
      gameManager.playerUpdated$.publish();
    }
    document.addEventListener('keydown', handleKeyDown);
    return function cleanup() {
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [gameManager]);

  const onClose = (coords: WorldCoords) => {
    setOpenPanes(openPanes.filter((c) => c !== coords));
  };

  useEffect(() => {
    const fetch = async () => {
      const newPrettifiedAddresses = new Map<EthAddress, string>(prettifiedAddresses);
      for (const [playerAddress, playerInfo] of playerInfos.value) {
        if (newPrettifiedAddresses.has(playerAddress)) continue;
        newPrettifiedAddresses.set(playerAddress, await prettifyAddress(playerInfo.realAddress));
      }
      setPrettifiedAddresses(newPrettifiedAddresses);
    };
    fetch();
  }, [playerInfos]);

  return (
    <>
      <Page>
        <>
          <FullScreen>
            <TransformWrapper initialScale={2}>
              <TransformComponent
                wrapperStyle={{
                  maxWidth: "100%",
                  maxHeight: "calc(100vh - 0.1px)",
                }}
              >
                {tiles.map((coordRow, i) => {
                  if (i == 0) return null;
                  return (
                    <GridRow key={i}>
                      {coordRow.map((tile, j) => {
                        if (j == 0) return null;

                        const baseColor = tinycolor(
                          tileTypeToColor[tile.tileType]
                        );

                        let color = baseColor.clone();

                        if (
                          curPosition.x !== tile.x ||
                          curPosition.y !== tile.y
                        ) {
                          color = baseColor.desaturate(100);
                        }

                        return (
                          <GridSquare
                            key={100 * i + j}
                            style={{
                              backgroundColor: color.toHexString(),
                            }}
                          />
                        );
                      })}
                    </GridRow>
                  );
                })}
              </TransformComponent>
            </TransformWrapper>
          </FullScreen>
        </>
      </Page>
    </>
  );
}

const Page = styled.div`
  color: black;
  font-size: 7;
  display: flex;
  flex-direction: column;
  align-items: center;
`;

const GridRow = styled.div`
  display: flex;
  flex-direction: row;
`;

const GridSquare = styled.div`
  width: 22px;
  height: 22px;
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
  background-image: url('/public/assets/clouds.svg');
  background-repeat: repeat;
  background-size: 20%;
  height: 100%;
  user-select: none;
`;

const SettingsIcon = styled.div`
  font-size: 64px;
  vertical-align: middle;
  margin: 0;
  position: absolute;
  bottom: 1%;
  left: 1%;
  color: white;
  font-weight: 300;
  line-height: 1.1;
  a {
    text-decoration: none;
  }
  user-select: none;
  cursor: pointer;
  z-index: 10;
`;
