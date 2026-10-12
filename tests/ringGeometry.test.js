import test from 'node:test';
import assert from 'node:assert/strict';
import { getRingLayout, getRingPose, isInsideRing } from '../src/ringGeometry.js';
import { ringImages } from '../src/portfolio.js';

const closeTo = (actual, expected, tolerance = 1e-8) => assert.ok(Math.abs(actual - expected) < tolerance, `${actual} should be close to ${expected}`);
const ringCount = ringImages.length;

test('near and far cards have the intended vertical position, depth and opacity', () => {
  const layout = getRingLayout(1200, 700);
  const far = getRingPose(0, ringCount, 90, layout);
  const near = getRingPose(0, ringCount, 270, layout);
  assert.ok(far.y < 0 && far.z < 0);
  assert.ok(near.y > 0 && near.z > 0);
  closeTo(far.x, 0);
  closeTo(near.x, 0);
  closeTo(far.opacity, .12);
  closeTo(near.opacity, 1);
  closeTo(near.z, -far.z);
});

test('rotation stays continuous across complete turns and keeps parallel facing within 90 degrees', () => {
  const layout = getRingLayout(1200, 700);
  const before = getRingPose(0, ringCount, 359.9, layout);
  const after = getRingPose(0, ringCount, 360.1, layout);
  closeTo(after.yaw - before.yaw, .2);
  assert.ok(after.yaw > 360);
  closeTo(after.facing, 360);

  for (let phase = -1000; phase <= 1000; phase += 7.5) {
    const pose = getRingPose(5, ringCount, phase, layout);
    assert.ok(Math.abs(pose.yaw - pose.facing) <= 90);
    closeTo(Math.sin(pose.facing * Math.PI / 180), 0);
    assert.equal(pose.flip, Math.cos(pose.yaw * Math.PI / 180) < 0 ? -1 : 1);
    assert.ok(pose.opacity >= .12 && pose.opacity <= 1);
  }
});

test('responsive layout leaves a wide center around small landscape photographs', () => {
  const desktop = getRingLayout(1200, 700);
  closeTo(desktop.radius, 408);
  closeTo(desktop.cardWidth, 102);
  closeTo(desktop.cardHeight, 57.375);
  closeTo(desktop.perspective, 2160);
  assert.equal(desktop.pitch, -27);
  assert.equal(desktop.originY, .42);
  assert.ok(desktop.radius / desktop.cardWidth >= 3.9);

  const phone = getRingLayout(360, 580);
  assert.ok(phone.radius >= 116 && phone.radius <= 123);
  assert.ok(phone.cardWidth >= 47 && phone.cardWidth <= 50);
  closeTo(phone.perspective, 950);
  assert.ok(phone.radius / phone.cardWidth >= 2.3);

  for (const layout of [desktop, phone, getRingLayout(840, 280)]) {
    closeTo(layout.cardWidth / layout.cardHeight, 16 / 9);
    assert.ok(layout.pitch <= -26 && layout.pitch >= -40);
  }
});

test('all projected card corners fit desktop, phone and short landscape scenes', () => {
  for (const [width, height] of [[1340, 570], [1200, 700], [360, 580], [320, 430], [840, 280], [2200, 500]]) {
    const layout = getRingLayout(width, height);
    const pitch = layout.pitch * Math.PI / 180;
    const margin = Math.min(Math.min(24, Math.max(12, width * .018)), width * .08, height * .08);
    for (let degrees = 0; degrees < 360; degrees += .5) {
      const pose = getRingPose(0, ringCount, degrees, layout);
      const yaw = degrees * Math.PI / 180;
      for (const u of [-layout.cardWidth / 2, layout.cardWidth / 2]) {
        for (const v of [-layout.cardHeight / 2, layout.cardHeight / 2]) {
          const x = pose.x + u * Math.cos(yaw);
          const y = pose.y + u * Math.sin(yaw) * Math.sin(pitch) + v * Math.cos(pitch);
          const z = pose.z - u * Math.sin(yaw) * Math.cos(pitch) + v * Math.sin(pitch);
          const projection = layout.perspective / (layout.perspective - z);
          const screenX = width / 2 + x * projection;
          const screenY = height * layout.originY + y * projection;
          assert.ok(screenX >= margin - .001 && screenX <= width - margin + .001, `${width}x${height}: x ${screenX} at ${degrees}deg`);
          assert.ok(screenY >= margin - .001 && screenY <= height - margin + .001, `${width}x${height}: y ${screenY} at ${degrees}deg`);
        }
      }
    }
  }
});

test('independent off-axis card cameras preserve the shared camera projection through hover', () => {
  for (const [width, height] of [[1340, 570], [360, 580], [840, 280]]) {
    const layout = getRingLayout(width, height);
    const camera = layout.perspective;
    for (let phase = -760; phase <= 760; phase += 38) {
      for (let index = 0; index < ringCount; index += 1) {
        const pose = getRingPose(index, ringCount, phase, layout);
        const localCamera = camera - pose.z;
        const itemScale = camera / localCamera;
        const projectedCenter = { x: pose.x * itemScale, y: pose.y * itemScale };
        const cameraOrigin = { x: -pose.x, y: -pose.y };

        // Include the intermediate tilt and scale, not just parallel cards.
        for (const hoverProgress of [0, .25, .5, .75, 1]) {
          const yaw = (pose.yaw + (pose.facing - pose.yaw) * hoverProgress) * Math.PI / 180;
          const pitch = layout.pitch * (1 - hoverProgress) * Math.PI / 180;
          const cardScale = .98 + (1.7568 - .98) * hoverProgress;
          for (const horizontal of [-layout.cardWidth / 2, layout.cardWidth / 2]) {
            for (const vertical of [-layout.cardHeight / 2, layout.cardHeight / 2]) {
              const u = horizontal * cardScale;
              const v = vertical * cardScale;
              // CSS rotateX(pitch) rotateY(yaw) scale(cardScale).
              const local = {
                x: u * Math.cos(yaw),
                y: u * Math.sin(yaw) * Math.sin(pitch) + v * Math.cos(pitch),
                z: -u * Math.sin(yaw) * Math.cos(pitch) + v * Math.sin(pitch),
              };

              // Original: move the corner into world space, then project once.
              const commonProjection = camera / (camera - pose.z - local.z);
              const common = {
                x: (pose.x + local.x) * commonProjection,
                y: (pose.y + local.y) * commonProjection,
              };

              // New: project around the offset local camera origin, then apply
              // the item's projected translation and uniform scale.
              const localProjection = localCamera / (localCamera - local.z);
              const independent = {
                x: projectedCenter.x + itemScale * (cameraOrigin.x + (local.x - cameraOrigin.x) * localProjection),
                y: projectedCenter.y + itemScale * (cameraOrigin.y + (local.y - cameraOrigin.y) * localProjection),
              };
              closeTo(independent.x, common.x);
              closeTo(independent.y, common.y);
            }
          }
        }
      }
    }
  }
});

test('zero-sized measurements stay finite while the scene is hidden', () => {
  const layout = getRingLayout(0, 0);
  const pose = getRingPose(0, ringCount, 0, layout);
  assert.ok(Object.values(layout).every(Number.isFinite));
  assert.ok(Object.values(pose).every(Number.isFinite));
});

test('center hit area follows the projected disk on desktop, phone and short screens', () => {
  for (const [width, height] of [[1340, 570], [1200, 700], [360, 580], [320, 430], [840, 280]]) {
    const layout = getRingLayout(width, height);
    assert.equal(isInsideRing(width / 2, height * layout.originY, width, height, layout), true);

    for (let degrees = 0; degrees < 360; degrees += 7.5) {
      for (const fraction of [.2, .65, .999, 1, 1.02]) {
        const pose = getRingPose(0, 1, degrees, { ...layout, radius: layout.radius * fraction });
        const projection = layout.perspective / (layout.perspective - pose.z);
        const x = width / 2 + pose.x * projection;
        const y = height * layout.originY + pose.y * projection;
        assert.equal(isInsideRing(x, y, width, height, layout), fraction <= 1,
          `${width}x${height}: ${degrees} degrees at radius ${fraction}`);
      }
    }

    for (const [x, y] of [[0, 0], [width, 0], [0, height], [width, height], [width / 2, 0], [width / 2, height]]) {
      assert.equal(isInsideRing(x, y, width, height, layout), false,
        `${width}x${height}: outer blank area ${x}, ${y}`);
    }
  }
});

test('center hit area safely ignores hidden scenes and invalid camera measurements', () => {
  const layout = getRingLayout(1200, 700);
  for (const input of [
    [NaN, 294, 1200, 700, layout],
    [600, Infinity, 1200, 700, layout],
    [0, 0, 0, 0, getRingLayout(0, 0)],
    [600, 294, -1200, 700, layout],
    [600, 294, 1200, 700, null],
    [600, 294, 1200, 700, { ...layout, radius: 0 }],
    [600, 294, 1200, 700, { ...layout, perspective: Infinity }],
    [600, 294, 1200, 700, { ...layout, pitch: 0 }],
  ]) assert.equal(isInsideRing(...input), false);

  const pitch = layout.pitch * Math.PI / 180;
  const horizonY = 700 * layout.originY + layout.perspective * Math.tan(pitch);
  assert.equal(isInsideRing(600, horizonY, 1200, 700, layout), false);
});
