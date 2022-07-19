import type { NextPage } from "next";

import styled from "styled-components";
import { TransformWrapper, TransformComponent } from "react-zoom-pan-pinch";
import tinycolor from "tinycolor2";
import { buildMap, dist, tileTypeToColor } from "./utils";

// NOTE: should this be defined on miner speed?
const LIGHT_RADIUS = 10;

const Home: NextPage = () => {
  const tiles = buildMap();

  // NOTE: eventually initialized on game start
  const curPosition = { x: 25, y: 25 };

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
