/**
 * useGhostClickShield
 *
 * Fixes the iOS "ghost click" bug where closing an overlay via a backdrop tap
 * causes the underlying element (product card, button, link) to also fire.
 *
 * How it works:
 *   1. Returns an `arm()` function you call right before closing the overlay.
 *   2. `arm()` captures the current timestamp and adds a capturing `click`
 *      listener on the document root that stops all events for ~350 ms.
 *      This swallows the synthetic click iOS dispatches after touchend.
 *   3. `pointer-events: none` is set on <body> for the same window,
 *      providing a CSS-level guard for pointer/mouse events.
 *
 * Usage:
 *   const armShield = useGhostClickShield();
 *   // Call armShield() just before setMobileOpen(false)
 */

import { useCallback, useRef } from 'react';

const SHIELD_MS = 350; // ms — enough for iOS synthetic click delay (~300 ms)

export function useGhostClickShield() {
  const shieldUntilRef = useRef(0);
  const timerRef = useRef(null);

  const arm = useCallback(() => {
    // Cancel any previous timer
    if (timerRef.current) clearTimeout(timerRef.current);

    shieldUntilRef.current = Date.now() + SHIELD_MS;

    // CSS guard — blocks hover / pointer events from reaching the page
    document.body.style.setProperty('pointer-events', 'none', 'important');

    // Capturing listener — absorbs any synthetic click iOS fires after touchend
    const absorb = (e) => {
      if (Date.now() < shieldUntilRef.current) {
        e.stopPropagation();
        e.stopImmediatePropagation();
        e.preventDefault();
      }
    };

    document.addEventListener('click',        absorb, { capture: true });
    document.addEventListener('touchstart',   absorb, { capture: true, passive: false });
    document.addEventListener('touchend',     absorb, { capture: true, passive: false });
    document.addEventListener('pointerdown',  absorb, { capture: true });

    timerRef.current = setTimeout(() => {
      shieldUntilRef.current = 0;
      document.body.style.removeProperty('pointer-events');
      document.removeEventListener('click',       absorb, { capture: true });
      document.removeEventListener('touchstart',  absorb, { capture: true });
      document.removeEventListener('touchend',    absorb, { capture: true });
      document.removeEventListener('pointerdown', absorb, { capture: true });
      timerRef.current = null;
    }, SHIELD_MS);
  }, []);

  return arm;
}
