import { useLayoutEffect } from 'react';

// Development-only frame cadence, exposed on the preview DOM for verification.
// Vite removes this probe's work from production builds.
export function useArchiveFrameStats(active, viewport) {
  useLayoutEffect(() => {
    if (!import.meta.env.DEV || !active) return;
    const samples = [];
    let frame;
    let previous;
    let flightCount = 0;
    let scrollDistance = 0;
    const startScroll = window.scrollY;
    const started = performance.now();
    const sample = now => {
      if (previous !== undefined) samples.push(now - previous);
      previous = now;
      flightCount = Math.max(flightCount, viewport.current?.querySelectorAll('.archive-flight').length || 0);
      scrollDistance = Math.max(scrollDistance, Math.abs(window.scrollY - startScroll));
      frame = requestAnimationFrame(sample);
    };
    frame = requestAnimationFrame(sample);
    return () => {
      cancelAnimationFrame(frame);
      if (!viewport.current || !samples.length) return;
      const ordered = [...samples].sort((a, b) => a - b);
      viewport.current.dataset.archiveFrameStats = JSON.stringify({
        run: Number(viewport.current.dataset.archiveRun || 0) + 1,
        flightCount,
        scrollDistance: Math.round(scrollDistance),
        durationMs: Math.round(performance.now() - started),
        frames: samples.length,
        medianMs: Math.round(ordered[Math.floor(ordered.length / 2)] * 10) / 10,
        p95Ms: Math.round(ordered[Math.floor(ordered.length * .95)] * 10) / 10,
        over34Ms: samples.filter(value => value > 34).length,
      });
      viewport.current.dataset.archiveRun = String(Number(viewport.current.dataset.archiveRun || 0) + 1);
    };
  }, [active, viewport]);
}
