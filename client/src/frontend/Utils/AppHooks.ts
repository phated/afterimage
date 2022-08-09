import { useCallback, useState } from 'react';
import { Wrapper } from '../../backend/Utils/Wrapper';
import type GameManager from '../../backend/GameManager';
import { useEmitterSubscribe } from './EmitterHooks';
import { createDefinedContext } from './createDefinedContext';
import type { CommitmentInfo, Tile } from '../../utils';

export const { useDefinedContext: useGameManager, provider: GameManagerProvider } =
  createDefinedContext<GameManager>();

export function useTiles(gameManager: GameManager | undefined): Wrapper<Tile[][]> {
  const [tiles, setTiles] = useState<Wrapper<Tile[][]>>(
    () => new Wrapper(gameManager ? gameManager.getTiles() : [])
  );

  const onUpdate = useCallback(() => {
    console.log('onUpdate setTiles');
    setTiles(new Wrapper(gameManager ? gameManager.getTiles() : []));
  }, [gameManager]);

  useEmitterSubscribe(gameManager?.minedTilesUpdated$, onUpdate);

  return tiles;
}

export function useSelfLoc(
  gameManager: GameManager | undefined
): Wrapper<CommitmentInfo | undefined> {
  const [selfLoc, setSelfLoc] = useState<Wrapper<CommitmentInfo | undefined>>(
    () => new Wrapper(gameManager ? gameManager.getSelfLoc() : undefined)
  );

  const onUpdate = useCallback(() => {
    console.log('onUpdate setSelfLoc');
    setSelfLoc(new Wrapper(gameManager ? gameManager.getSelfLoc() : undefined));
  }, [gameManager]);

  useEmitterSubscribe(gameManager?.minedTilesUpdated$, onUpdate);
  useEmitterSubscribe(gameManager?.playerUpdated$, onUpdate);

  return selfLoc;
}

export function useMyWins(gameManager: GameManager | undefined): Wrapper<number> {
  const [myWins, setMyWins] = useState<Wrapper<number>>(
    () => new Wrapper(gameManager ? gameManager.getWins() : 0)
  );

  const onUpdate = useCallback(() => {
    console.log('onUpdate setMyWins');
    setMyWins(new Wrapper(gameManager ? gameManager.getWins() : 0));
  }, [gameManager]);

  useEmitterSubscribe(gameManager?.battleUpdated$, onUpdate);

  return myWins;
}

// /**
//  * Hook which gets you the tiles
//  */
// export function useTiles(gameManager: GameManager | undefined): Wrapper<Tile[][]> {
//   const [tiles, setTiles] = useState<Wrapper<Tile[][]>>(
//     () => new Wrapper(gameManager ? gameManager.getTiles() : [])
//   );

//   const onUpdate = useCallback(() => {
//     console.log('onUpdate');
//     setTiles(new Wrapper(gameManager ? gameManager.getTiles() : []));
//   }, [gameManager]);

//   useEmitterSubscribe(gameManager?.tileUpdated$, onUpdate);

//   return tiles;
// }

// export function useInfo(
//   gameManager: GameManager | undefined
// ): Wrapper<Map<EthAddress, PlayerInfo>> {
//   const [playerInfos, setPlayerInfos] = useState<Wrapper<Map<EthAddress, PlayerInfo>>>(
//     () => new Wrapper(new Map())
//   );

//   const onUpdate = useCallback(async () => {
//     console.log('onUpdate useLocation');
//     const newInfos = gameManager ? await gameManager.getPlayerInfos() : new Map();
//     console.log('useLocation infos', newInfos);
//     setPlayerInfos(new Wrapper(newInfos));
//   }, [gameManager]);

//   useEmitterSubscribe(gameManager?.playerUpdated$, onUpdate);

//   return playerInfos;
// }

// export function useInitted(gameManager: GameManager | undefined): Wrapper<boolean> {
//   const [initted, setinitted] = useState<Wrapper<boolean>>(() => new Wrapper(false));

//   const onUpdate = useCallback(async () => {
//     const newInitted = gameManager ? await gameManager.getInitted() : false;
//     setinitted(new Wrapper(newInitted));
//   }, [gameManager]);

//   useEmitterSubscribe(gameManager?.playerUpdated$, onUpdate);

//   return initted;
// }

// export function useTileTxStatus(gameManager: GameManager | undefined): {
//   submitted: Wrapper<string[]>;
//   confirmed: Wrapper<string[]>;
//   reverted: Wrapper<string[]>;
// } {
//   const [submittedTileTx, setSubmittedTileTx] = useState<Wrapper<string[]>>(() => new Wrapper([]));
//   const [confirmedTileTx, setConfirmedTileTx] = useState<Wrapper<string[]>>(() => new Wrapper([]));
//   const [revertedTileTx, setRevertedTileTx] = useState<Wrapper<string[]>>(() => new Wrapper([]));

//   const onUpdate = useCallback(async ([tx, status]) => {
//     if (status == 'submitted') {
//       setSubmittedTileTx(new Wrapper([...submittedTileTx.value, tx.actionId]));
//     }
//     if (status == 'confirmed') {
//       setConfirmedTileTx(new Wrapper([...confirmedTileTx.value, tx.actionId]));
//     }
//     if (status == 'reverted') {
//       setRevertedTileTx(new Wrapper([...revertedTileTx.value, tx.actionId]));
//     }
//   }, []);

//   useEmitterSubscribe(gameManager?.tileTxUpdated$, onUpdate);

//   return {
//     submitted: submittedTileTx,
//     confirmed: confirmedTileTx,
//     reverted: revertedTileTx,
//   };
// }
