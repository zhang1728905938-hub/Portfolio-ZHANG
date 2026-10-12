import { useEffect, useRef } from 'react';
import { getRingLayout, getRingPose } from './ringGeometry';
import { RingMotion } from './ringMotion';

// One clock moves the ring; CSS turns an inspected photograph toward the viewer.
export function useSpatialRing({ active, manualPaused, inspecting, itemCount, clearInspection }) {
  const ringRef = useRef(null);
  const controllerRef = useRef(null);
  if (!controllerRef.current) controllerRef.current = new RingMotion();
  const optionsRef = useRef(null);
  optionsRef.current = { active, manualPaused, inspecting, clearInspection };
  const syncRef = useRef(null);

  useEffect(() => {
    const ring = ringRef.current;
    if (!ring) return;
    const items = [...ring.querySelectorAll('.spatial-ring-item')];
    const motion = window.matchMedia('(prefers-reduced-motion: reduce)');
    const controller = controllerRef.current;
    let layout;
    let frame = 0;
    let previous = 0;
    let paintedPhase;
    const options = () => ({
      ...optionsRef.current,
      active: optionsRef.current.active && !document.hidden,
      reducedMotion: motion.matches,
    });
    const announce = state => {
      ring.dataset.rotation = state.mode;
    };
    const paint = () => {
      if (!layout) return;
      paintedPhase = controller.phase;
      ring.dataset.phase = controller.phase.toFixed(3);
      items.forEach((item, index) => {
        const pose = getRingPose(index, items.length, controller.phase, layout);
        // Decompose the common camera into a projected center and a local
        // off-axis perspective. Each card can then rise above its siblings
        // while inspected without jumping forward or changing its screen size.
        const distance = layout.perspective - pose.z;
        const projection = layout.perspective / distance;
        item.style.transform = `translate3d(${(pose.x * projection).toFixed(3)}px, ${(pose.y * projection).toFixed(3)}px, 0) scale(${projection})`;
        item.style.setProperty('--card-perspective', `${distance}px`);
        item.style.setProperty('--card-camera-x', `${-pose.x}px`);
        item.style.setProperty('--card-camera-y', `${-pose.y}px`);
        item.style.setProperty('--card-depth', String(Math.round(pose.z + layout.radius + 10)));
        item.style.setProperty('--card-yaw', `${pose.yaw}deg`);
        item.style.setProperty('--card-facing', `${pose.facing}deg`);
        item.style.setProperty('--card-flip', String(pose.flip));
        item.style.setProperty('--card-opacity', pose.opacity.toFixed(4));
      });
    };
    const resize = () => {
      const { width, height } = ring.getBoundingClientRect();
      layout = getRingLayout(width, height);
      ring.style.setProperty('--ring-perspective', `${layout.perspective}px`);
      ring.style.setProperty('--ring-card-width', `${layout.cardWidth}px`);
      ring.style.setProperty('--ring-card-height', `${layout.cardHeight}px`);
      ring.style.setProperty('--ring-origin', `${layout.originY * 100}%`);
      ring.style.setProperty('--card-pitch', `${layout.pitch}deg`);
      paint();
    };
    const tick = now => {
      frame = 0;
      const state = controller.step(previous ? (now - previous) / 1000 : 0, now, options());
      previous = now;
      announce(state);
      if (paintedPhase !== controller.phase) paint();
      if (state.needsFrame) frame = requestAnimationFrame(tick);
      else previous = 0;
    };
    const sync = () => {
      const state = controller.step(0, performance.now(), options());
      announce(state);
      if (paintedPhase !== controller.phase) paint();
      if (state.needsFrame && !frame) frame = requestAnimationFrame(tick);
      else if (!state.needsFrame) {
        cancelAnimationFrame(frame);
        frame = 0;
        previous = 0;
      }
    };
    syncRef.current = sync;
    const blur = () => { optionsRef.current.clearInspection?.(); sync(); };
    const visibility = () => {
      if (document.hidden) optionsRef.current.clearInspection?.();
      sync();
    };
    const observer = new ResizeObserver(resize);
    observer.observe(ring);
    resize();
    sync();
    window.addEventListener('blur', blur);
    document.addEventListener('visibilitychange', visibility);
    motion.addEventListener('change', sync);
    return () => {
      cancelAnimationFrame(frame);
      observer.disconnect();
      syncRef.current = null;
      window.removeEventListener('blur', blur);
      document.removeEventListener('visibilitychange', visibility);
      motion.removeEventListener('change', sync);
    };
  }, [itemCount]);
  useEffect(() => { syncRef.current?.(); }, [active, manualPaused, inspecting]);
  return ringRef;
}
