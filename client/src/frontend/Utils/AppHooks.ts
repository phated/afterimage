import { useCallback, useState } from 'react';
import { Wrapper } from '../../backend/Utils/Wrapper';
import type GameManager from '../../backend/GameManager';
import { useEmitterSubscribe } from './EmitterHooks';
import type { CommitmentInfo, Tile } from '../../utils';

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
