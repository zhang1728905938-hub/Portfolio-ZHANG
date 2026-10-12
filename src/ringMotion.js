const clamp = (value, min, max) => Math.min(max, Math.max(min, value));

// Keep the phase continuous when autoplay pauses for photograph inspection.
// step's dt is seconds; autoplay is 20% faster than the previous 3.465 deg/s.
export class RingMotion {
  constructor(initialPhase = -28) {
    this.phase = initialPhase;
  }

  step(dt, _now, {
    active = true,
    manualPaused = false,
    inspecting = false,
    reducedMotion = false,
  } = {}) {
    const mode = !active ? 'inactive'
      : inspecting ? 'inspecting'
        : manualPaused || reducedMotion ? 'paused'
          : 'running';
    const automatic = mode === 'running';

    if (automatic) {
      // Avoid a visible jump after a suspended tab or an unusually long frame.
      const elapsed = clamp(Number.isFinite(dt) ? dt : 0, 0, .05);
      this.phase -= elapsed * 4.158;
    }

    return { phase: this.phase, mode, moving: false, needsFrame: automatic };
  }
}
