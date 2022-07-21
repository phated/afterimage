import React, { useEffect, useRef, useState } from "react";
import styled from "styled-components";
import tinycolor from "tinycolor2";
import GameManager from "../backend/GameManager";
import { DEV_TEST_PRIVATE_KEY, Tile, TileType, WorldCoords } from "../utils";
import { tileTypeToColor } from "../utils";
import {
  TransformWrapper,
  TransformComponent,
} from "@pronestor/react-zoom-pan-pinch";
import { Tooltip, Text, Loading, Grid, Card } from "@nextui-org/react";
import { EthConnection } from "@darkforest_eth/network";
import { getEthConnection } from "../backend/Blockchain";
import { PluginManager } from "../backend/PluginManager";

const enum LoadingStep {
  NONE,
  LOADED_ETH_CONNECTION,
  LOADED_GAME_MANAGER,
  LOADED_PLUGIN_MANAGER,
}

function dist(a: WorldCoords, b: WorldCoords) {
  return Math.sqrt(Math.pow(a.x - b.x, 2) + Math.pow(a.y - b.y, 2));
}

function buildTiles(gridUpperBound: number) {
  console.log(`grid upper bound: ${gridUpperBound}`);
  const tiles: Tile[][] = [];
  for (let y = 0; y < gridUpperBound; y++) {
    const row: Tile[] = [];
    for (let x = 0; x < gridUpperBound; x++) {
      row.push({
        coords: { x, y },
        tileType: TileType.SAND,
      });
    }

    tiles.push(row);
  }
  return tiles;
}

export default function Game() {
  const privateKey = DEV_TEST_PRIVATE_KEY[0];

  const [gameManager, setGameManager] = useState<GameManager | undefined>();
  const [pluginManager, setPluginManager] = useState<
    PluginManager | undefined
  >();
  const [ethConnection, setEthConnection] = useState<
    EthConnection | undefined
  >();
  const [step, setStep] = useState(LoadingStep.NONE);
  const [error, setError] = useState("no errors");
  const [tiles, setTiles] = useState<Tile[][]>([]);
  const [curPosition, setCurPosition] = useState<WorldCoords>({ x: 2, y: 4 });

  // map for mined tiles (coords -> hash)
  const [minedTiles, setMinedTiles] = useState<{}>({});

  // map for hash -> address based on contract events

  useEffect(() => {
    getEthConnection()
      .then(async (ethConnection) => {
        ethConnection.setAccount(privateKey);
        setEthConnection(ethConnection);
        setStep(LoadingStep.LOADED_ETH_CONNECTION);
        const gm = await GameManager.create(ethConnection);
        window.gm = gm;
        // TODO: add back in after testing manually
        // gm.startMining(curPosition);
        setGameManager(gm);
        setTiles(buildTiles(gm.getGridUpperBound()));
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

  const onGridClick = (
    event: React.MouseEvent<HTMLDivElement, MouseEvent>,
    coords: WorldCoords
  ) => {
    event.preventDefault();
    console.log("coords", coords);
    console.log("tile", tiles[coords.x][coords.y]);
  };

  return (
    <>
      <Page>
        {gameManager && tiles ? (
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
                    return (
                      <GridRow key={i}>
                        {coordRow.map((tile, j) => {
                          const baseColor = tinycolor(
                            tileTypeToColor[tile.tileType]
                          );

                          let color;

                          // TODO: add mining stuff
                          if (
                            curPosition.x == tile.coords.x &&
                            curPosition.y == tile.coords.y
                          ) {
                            color = baseColor.clone();
                          } else {
                            color = baseColor.clone().desaturate(100);
                          }

                          return (
                            <GridSquare
                              key={100 * i + j}
                              style={{
                                backgroundColor: color.toHexString(),
                              }}
                              onContextMenu={(event) =>
                                onGridClick(event, { x: i, y: j })
                              }
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
        ) : (
          <FullScreen>
            <Title>
              <Text h1 size={96} color="secondary">
                defcon procgen workshop
              </Text>
            </Title>
            <SubTitle>
              <Text h2 size={64} color="secondary">
                Loading
                <Loading type="points-opacity" size="lg" color="secondary" />
              </Text>
              {error != "no errors" && (
                <Text h2 size={64} color="secondary">
                  {error}
                </Text>
              )}
            </SubTitle>
          </FullScreen>
        )}
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
