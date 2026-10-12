import { useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react';
import { captureArchiveSource, resolveArchiveFlights } from './archiveTransition';
import { useArchiveFrameStats } from './useArchiveFrameStats';

// Only observe scrolling. The one-second flight lives in document coordinates,
// so both the photographs and their destinations keep moving with the page.
export function useScrollArchive(mainRef, disabled) {
  const [archive, setArchive] = useState(null);
  useArchiveFrameStats(Boolean(archive), mainRef);
  const busy = useRef(false);
  const disabledRef = useRef(disabled);
  disabledRef.current = disabled;
  const complete = useCallback(() => {
    busy.current = false;
    setArchive(null);
  }, []);
  const reveal = useCallback(() => {
    setArchive(current => current ? { ...current, phase: 'revealing' } : null);
  }, []);

  useEffect(() => {
    const main = mainRef.current;
    const scene = main?.querySelector('.spatial-ring-scene');
    if (!scene) return;
    const motion = window.matchMedia('(prefers-reduced-motion: reduce)');
    let armed = true;
    let previousY = window.scrollY;
    let frame = 0;
    const update = () => {
      frame = 0;
      const y = window.scrollY;
      const downward = y > previousY + .5;
      previousY = y;
      const rect = scene.getBoundingClientRect();
      // Returning above Contact prepares a fresh arrival, but small movements
      // within the ring never restart an animation already seen.
      if (rect.top > window.innerHeight + 48) {
        armed = true;
        if (busy.current) complete();
        return;
      }
      const headerBottom = document.querySelector('.site-header')?.getBoundingClientRect().bottom || 0;
      const arrivalLine = window.innerHeight * .66;
      if (armed && downward && !busy.current && !disabledRef.current && !motion.matches &&
          !document.hidden && rect.top + rect.height * .42 <= arrivalLine && rect.bottom > headerBottom) {
        armed = false;
        busy.current = true;
        // Pause the real ring before measuring the exact landing planes.
        setArchive({ phase: 'preparing' });
      }
    };
    const schedule = () => { if (!frame) frame = requestAnimationFrame(update); };
    const cancel = () => { previousY = window.scrollY; complete(); };
    const onVisibility = () => { if (document.hidden) cancel(); };
    window.addEventListener('scroll', schedule, { passive: true });
    window.addEventListener('resize', cancel);
    motion.addEventListener('change', cancel);
    document.addEventListener('visibilitychange', onVisibility);
    return () => {
      cancelAnimationFrame(frame);
      window.removeEventListener('scroll', schedule);
      window.removeEventListener('resize', cancel);
      motion.removeEventListener('change', cancel);
      document.removeEventListener('visibilitychange', onVisibility);
    };
  }, [mainRef, complete]);

  useLayoutEffect(() => {
    if (archive?.phase !== 'preparing') return;
    const main = mainRef.current;
    const rect = main.getBoundingClientRect();
    const scene = main.querySelector('.spatial-ring-scene').getBoundingClientRect();
    const snapshot = captureArchiveSource(main, {
      left: rect.left, top: 0, width: rect.width,
      height: window.innerHeight, bottom: window.innerHeight,
    });
    const flights = resolveArchiveFlights(snapshot, main);
    if (!flights.length) { complete(); return; }
    setArchive({
      phase: 'flying', flights,
      viewport: { ...snapshot.viewport, height: Math.max(window.innerHeight, scene.bottom + 24) },
      documentTop: -rect.top,
    });
  }, [archive?.phase, mainRef, complete]);

  useEffect(() => { if (disabled) complete(); }, [disabled, complete]);

  return { archive, reveal, complete };
}
