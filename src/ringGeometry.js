const toRadians = degrees => degrees * Math.PI / 180;
const clamp = (value, min, max) => Math.min(max, Math.max(min, value));

// The outer corners sweep an ellipse in 3D. These bounds include perspective
// and the card height, so fitting the ring does not crop its nearest images.
function projectedBounds(radius, cardWidth, cardHeight, perspective, pitch) {
  const outerRadius = radius + cardWidth / 2;
  const sin = Math.sin(toRadians(pitch));
  const cos = Math.cos(toRadians(pitch));
  let halfWidth = 0;
  let top = 0;
  let bottom = 0;

  for (const vertical of [-cardHeight / 2, cardHeight / 2]) {
    const distance = perspective - vertical * sin;
    const depth = outerRadius * cos;
    if (distance <= depth) return { halfWidth: Infinity, top: -Infinity, bottom: Infinity };
    halfWidth = Math.max(halfWidth, perspective * outerRadius / Math.sqrt(distance ** 2 - depth ** 2));
    for (const direction of [-1, 1]) {
      const y = perspective * (outerRadius * direction * sin + vertical * cos) / (distance + direction * depth);
      top = Math.min(top, y);
      bottom = Math.max(bottom, y);
    }
  }

  return { halfWidth, top, bottom };
}

export function getRingLayout(width, height) {
  const sceneWidth = Math.max(1, Number.isFinite(width) ? width : 1);
  const sceneHeight = Math.max(1, Number.isFinite(height) ? height : 1);
  const pitch = -27;
  const originY = .42;
  const perspective = Math.max(950, sceneWidth * 1.8);
  const radius = Math.min(sceneWidth * .40, sceneHeight * .88, 540);
  const cardWidth = clamp(sceneWidth * .085, 50, 132);
  const cardHeight = cardWidth * 9 / 16;
  const margin = Math.min(clamp(sceneWidth * .018, 12, 24), sceneWidth * .08, sceneHeight * .08);

  const fits = scale => {
    const bounds = projectedBounds(radius * scale, cardWidth * scale, cardHeight * scale, perspective, pitch);
    return bounds.halfWidth <= sceneWidth / 2 - margin &&
      bounds.top >= -sceneHeight * originY + margin &&
      bounds.bottom <= sceneHeight * (1 - originY) - margin;
  };

  let scale = 1;
  if (!fits(scale)) {
    let low = 0;
    let high = 1;
    for (let step = 0; step < 16; step += 1) {
      const middle = (low + high) / 2;
      if (fits(middle)) low = middle;
      else high = middle;
    }
    scale = low;
  }

  // Pull the fitted ring inward by 15% while keeping its camera and photo size.
  return { radius: radius * scale * .85, perspective, cardWidth: cardWidth * scale, cardHeight: cardHeight * scale, pitch, originY };
}

export function getRingPose(index, count, phaseDegrees, layout) {
  const yaw = index * 360 / Math.max(1, count) + phaseDegrees;
  const theta = toRadians(yaw);
  const pitch = toRadians(layout.pitch);
  const x = layout.radius * Math.cos(theta);
  const y = layout.radius * Math.sin(theta) * Math.sin(pitch);
  const z = -layout.radius * Math.sin(theta) * Math.cos(pitch);
  const depth = clamp((1 - Math.sin(theta)) / 2, 0, 1);

  return {
    x, y, z, yaw,
    facing: Math.round(yaw / 180) * 180,
    flip: Math.cos(theta) < 0 ? -1 : 1,
    opacity: .12 + .88 * depth ** .7,
  };
}

// Hit the projected horizontal disk, including its empty center. Inverting
// the shared camera keeps this region aligned with both sides of the ring,
// whose near and far halves are not symmetric after perspective projection.
export function isInsideRing(x, y, width, height, layout) {
  const { radius, perspective, pitch, originY } = layout || {};
  if (![x, y, width, height, radius, perspective, pitch, originY].every(Number.isFinite) ||
      width <= 0 || height <= 0 || radius <= 0 || perspective <= 0) return false;

  const sin = Math.sin(toRadians(pitch));
  const cos = Math.cos(toRadians(pitch));
  if (Math.abs(sin) < 1e-8) return false;

  const screenX = x - width / 2;
  const screenY = y - height * originY;
  const denominator = perspective * sin - screenY * cos;
  if (Math.abs(denominator) < 1e-8) return false;

  const diskY = screenY * perspective / denominator;
  const cameraDistance = perspective + diskY * cos;
  if (cameraDistance <= 0) return false;
  const diskX = screenX * cameraDistance / perspective;
  // Include exact circumference points despite floating-point roundoff.
  return Math.hypot(diskX, diskY) <= radius * (1 + 1e-9);
}
