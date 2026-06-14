import { useEffect } from 'react';

/**
 * Calls onDismiss when the user taps/clicks outside all provided refs.
 * @param {React.RefObject<HTMLElement> | React.RefObject<HTMLElement>[]} refs
 * @param {() => void} onDismiss
 * @param {boolean} enabled
 */
export function useDismissOnOutside(refs, onDismiss, enabled) {
  useEffect(() => {
    if (!enabled || !onDismiss) return undefined;

    const nodes = () => (Array.isArray(refs) ? refs : [refs])
      .map((r) => r?.current)
      .filter(Boolean);

    const isOutside = (target) => {
      if (!(target instanceof Node)) return true;
      return nodes().every((node) => !node.contains(target));
    };

    const onPointerDown = (e) => {
      if (isOutside(e.target)) onDismiss();
    };

    document.addEventListener('pointerdown', onPointerDown);

    return () => {
      document.removeEventListener('pointerdown', onPointerDown);
    };
  }, [refs, onDismiss, enabled]);
}
