import type { Callback, Monomitter } from '@darkforest_eth/events';
import { useEffect } from 'react';

/**
 * Execute something on emitter callback
 * @param emitter `Monomitter` to subscribe to
 * @param callback callback to subscribe
 */
export function useEmitterSubscribe<T>(emitter: Monomitter<T> | undefined, callback: Callback<T>) {
  useEffect(() => {
    return emitter?.subscribe(callback).unsubscribe;
  }, [emitter, callback]);
}
