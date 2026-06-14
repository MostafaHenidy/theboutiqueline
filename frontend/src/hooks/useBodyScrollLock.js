import { useEffect } from 'react';

let lockCount = 0;
let savedScrollY = 0;

function applyLock() {
  if (lockCount === 1) {
    savedScrollY = window.scrollY;
    document.documentElement.classList.add('scroll-locked');
  }
}

function releaseLock(restorePosition) {
  if (lockCount === 0) {
    document.documentElement.classList.remove('scroll-locked');
    if (restorePosition === 'top') {
      window.scrollTo(0, 0);
    } else if (restorePosition !== 'skip') {
      window.scrollTo(0, savedScrollY);
    }
  }
}

/**
 * Prevents page scrolling while `locked` is true.
 * Multiple consumers can lock simultaneously — scroll restores when the last one unlocks.
 *
 * @param {boolean} locked
 * @param {{ current: string|null }} [restoreToRef]
 *   Set `restoreToRef.current = 'top'` before unlocking to scroll to top instead of
 *   restoring the saved position.
 */
export function useBodyScrollLock(locked, restoreToRef) {
  useEffect(() => {
    if (!locked) return undefined;

    lockCount++;
    applyLock();

    return () => {
      lockCount = Math.max(0, lockCount - 1);
      const mode = restoreToRef?.current ?? 'restore';
      if (restoreToRef) restoreToRef.current = null;
      releaseLock(mode);
    };
  }, [locked]); // eslint-disable-line react-hooks/exhaustive-deps
}

/** Emergency escape hatch — force-clear all locks. */
export function forceUnlockScroll() {
  lockCount = 0;
  document.documentElement.classList.remove('scroll-locked');
}
