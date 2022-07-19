import type { NextPage } from "next";

import styled from "styled-components";
import { TransformWrapper, TransformComponent } from "react-zoom-pan-pinch";
import tinycolor from "tinycolor2";
import { buildMap, dist, tileTypeToColor } from "./utils";
import { useEffect, useRef, useState } from "react";

import { EthConnection } from "afterimage-network";
import { getEthConnection } from "../lib/blockchain";

// NOTE: should this be defined on miner speed?
const LIGHT_RADIUS = 10;

const Home: NextPage = () => {
  const [moveQueue, setMoveQueue] = useState<[number, number][]>([]);
  const [curPosition, setCurPosition] = useState<{ x: number; y: number }>({
    x: 25,
    y: 25,
  });

  const [ethConnection, setEthConnection] = useState<
    EthConnection | undefined
  >();

  // NOTE: eventually initialize based on seed, etc.
  const tiles = buildMap();

  useEffect(() => {
    getEthConnection()
      .then(async (ethConnection) => {
        // NOTE: this is set based on lakshman's local hardhat node
        ethConnection.setAccount(privateKey);
        setEthConnection(ethConnection);
        console.log("eth connection :", ethConnection);
      })
      .catch((e) => {
        console.log(e);
      });
  }, []);

  useEffect(() => {
    document.addEventListener("keydown", handleKeyDown);
    return function cleanup() {
      document.removeEventListener("keydown", handleKeyDown);
    };
  });

  useEffect(() => {
    console.log("moveQueue", moveQueue);
    if (moveQueue.length === 0) return;

    console.log(`cur position: ${curPosition}`);

    // TODO: boundary checking
    const newPosition = {
      x: curPosition.x + moveQueue[0][0],
      y: curPosition.y + moveQueue[0][1],
    };
    console.log(`new position: ${newPosition}`);
    setCurPosition(newPosition);

    // TODO: contract call with proof

    setMoveQueue((x) => x.slice(1));
    // if (curMove.current === "") {
    // set ref
    // do the contract call
    // change curPosition
    // }
  }, [moveQueue]);

  const handleKeyDown = (event: KeyboardEvent) => {
    const eve = event.target as HTMLElement;
    if (eve.tagName.toLowerCase() !== "body") return;
    const key = event.key.toLowerCase();

    console.debug("Key event", key);
    const keyToDirection: any = {
      w: [0, -1],
      a: [-1, 0],
      s: [0, 1],
      d: [1, 0],
    };

    if (!(key in keyToDirection)) return;
    setMoveQueue((x) => [...x, keyToDirection[key]]);
  };
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
};

export default Home;

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
