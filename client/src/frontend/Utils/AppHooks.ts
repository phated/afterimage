import { useCallback, useState, useEffect } from 'react';
import type GameManager from '../../backend/GameManager';
import type { Callback, Monomitter } from '@projectsophon/events';
import type { CommitmentInfo, Tile } from '../../utils';

/**
 * React uses referential identity to detect changes, and rerender. Rather
 * than copying an object into a new object, to force a rerender, we can
 * just wrap it in a new {@code Wrapper}, which will force a rerender.
 */
class Wrapper<T> {
  public readonly value: T;

  public constructor(value: T) {
    this.value = value;
  }

  public or(wrapper: Wrapper<T>) {
    return new Wrapper(this.value || wrapper.value);
  }
}

/**
 * Execute something on emitter callback
 * @param emitter `Monomitter` to subscribe to
 * @param callback callback to subscribe
 */
function useEmitterSubscribe<T>(emitter: Monomitter<T> | undefined, callback: Callback<T>) {
  useEffect(() => {
    return emitter?.subscribe(callback).unsubscribe;
  }, [emitter, callback]);
}

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
