export const FLIGHT_DURATION = 780;
export const MAX_STAGGER = 120;
export const REVEAL_DURATION = 100;
const FRAME_STEPS = 16;
const clamp = (value, min, max) => Math.min(max, Math.max(min, value));
const mix = (from, to, progress) => from + (to - from) * progress;
const smooth = progress => progress * progress * (3 - 2 * progress);
const rounded = value => Math.round(value * 1000) / 1000;
const bezier = (a, b, c, d, t) => (1 - t) ** 3 * a + 3 * (1 - t) ** 2 * t * b + 3 * (1 - t) * t ** 2 * c + t ** 3 * d;

export function archiveLandingTime(count) {
  return count > 0 ? FLIGHT_DURATION + (count > 1 ? MAX_STAGGER : 0) : 0;
}

export function createArchiveFlight(flight, index, count, viewport) {
  const { from, to } = flight;
  const delay = count > 1 ? index / (count - 1) * MAX_STAGGER : 0;
  const direction = to.x < viewport.width / 2 ? -1 : 1;
  const fan = Math.min(56, viewport.width * .043) * direction;
  const firstX = from.x + fan * .28;
  const firstY = from.y - (from.visible ? Math.min(60, viewport.height * .1) : -viewport.height * .24);
  const secondX = mix(from.x, to.x, .7) + fan;
  const secondY = to.y - Math.min(76, viewport.height * .12);
  const wrapperFrames = [];
  const planeFrames = [];
  // Only visible 4:3 source photographs need a changing crop. All synthetic
  // copies already use the ring's 16:9 shape and keep a static cover image.
  const imageFrames = from.visible && Math.abs(from.width / from.height - to.width / to.height) > .001 ? [] : null;
  const imageAspect = flight.imageAspect || 16 / 9;

  for (let step = 0; step <= FRAME_STEPS; step += 1) {
    const t = step / FRAME_STEPS;
    const morph = smooth(clamp((t - .05) / .76, 0, 1));
    const turn = smooth(clamp((t - .2) / .8, 0, 1));
    const depth = smooth(clamp((t - .15) / .85, 0, 1));
    const width = mix(from.width, to.width, morph);
    const height = mix(from.height, to.height, morph);
    const x = bezier(from.x, firstX, secondX, to.x, t);
    const y = bezier(from.y, firstY, secondY, to.y, t);
    const scale = mix(1, to.scale, depth) + Math.sin(t * Math.PI) * .035;
    const entry = from.visible ? 1 : smooth(clamp(t / .17, 0, 1));
    const opacity = entry * mix(1, to.opacity, smooth(clamp((t - .64) / .36, 0, 1)));

    // Rasterize each card once at its fixed final size. Dimensions, depth,
    // border, shadow, and filter never animate or invalidate layout/paint.
    wrapperFrames.push({
      offset: t,
      transform: `translate3d(${rounded(x - to.width / 2)}px, ${rounded(y - to.height / 2)}px, 0) scale(${rounded(width / to.width * scale)}, ${rounded(height / to.height * scale)})`,
      opacity,
    });
    planeFrames.push({
      offset: t,
      transform: `rotateX(${rounded(to.pitch * turn)}deg) rotateY(${rounded(to.yaw * turn)}deg) scale(${rounded(mix(1, .98, turn))})`,
    });
    if (imageFrames) {
      const aspect = width / height;
      imageFrames.push({
        offset: t,
        transform: `scale(${rounded(Math.max(1, imageAspect / aspect))}, ${rounded(Math.max(1, aspect / imageAspect))})`,
      });
    }
  }

  return { ...flight, delay, wrapperFrames, planeFrames, imageFrames };
}
