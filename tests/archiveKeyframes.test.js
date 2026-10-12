import test from 'node:test';
import assert from 'node:assert/strict';
import { archiveLandingTime, createArchiveFlight, FLIGHT_DURATION, MAX_STAGGER, REVEAL_DURATION } from '../src/archiveKeyframes.js';

const viewport = { width: 1440, height: 670 };
const source = {
  id: 'ring-0', projectId: '01', slot: 'ring-0', duplicate: false, imageAspect: 1.5,
  from: { x: 950, y: 325, width: 240, height: 180, visible: true },
  to: { x: 410, y: 435, width: 120, height: 67.5, scale: .92, pitch: -27, yaw: 35, opacity: .74, depth: 440 },
};
const transformNumbers = value => [...value.matchAll(/-?\d*\.?\d+/g)].map(match => Number(match[0]));

test('archive motion only animates compositor properties on all 56 flights', () => {
  for (let index = 0; index < 56; index += 1) {
    const flight = createArchiveFlight(source, index, 56, viewport);
    for (const frames of [flight.wrapperFrames, flight.planeFrames, flight.imageFrames]) {
      for (const frame of frames || []) {
        assert.ok(Object.keys(frame).every(key => ['offset', 'transform', 'opacity'].includes(key)));
        assert.doesNotMatch(frame.transform, /NaN|Infinity/);
      }
    }
  }
});

test('fixed-size flight preserves its source rectangle and exact destination plane', () => {
  const flight = createArchiveFlight(source, 0, 56, viewport);
  // The first number is the 3 in translate3d; the rest are x,y,z,sx,sy.
  const [, startX, startY, , startScaleX, startScaleY] = transformNumbers(flight.wrapperFrames[0].transform);
  assert.equal(startX + source.to.width / 2, source.from.x);
  assert.equal(startY + source.to.height / 2, source.from.y);
  assert.equal(source.to.width * startScaleX, source.from.width);
  assert.ok(Math.abs(source.to.height * startScaleY - source.from.height) < .04);
  const [, endX, endY, , endScaleX, endScaleY] = transformNumbers(flight.wrapperFrames.at(-1).transform);
  assert.equal(endX + source.to.width / 2, source.to.x);
  assert.equal(endY + source.to.height / 2, source.to.y);
  assert.equal(endScaleX, source.to.scale);
  assert.equal(endScaleY, source.to.scale);
  assert.equal(flight.wrapperFrames.at(-1).opacity, source.to.opacity);
  assert.equal(flight.planeFrames.at(-1).transform, 'rotateX(-27deg) rotateY(35deg) scale(0.98)');
});

test('synthetic stream keeps distinct hidden origins and uses no image-crop animation', () => {
  const copies = [-50, -86, -122].map((y, index) => createArchiveFlight({
    ...source,
    duplicate: true,
    from: { x: 600 + index * 60, y, width: 160, height: 90, visible: false },
  }, index, 56, viewport));
  assert.equal(new Set(copies.map(flight => flight.wrapperFrames[0].transform)).size, 3);
  for (const flight of copies) {
    assert.equal(flight.imageFrames, null);
    assert.equal(flight.wrapperFrames[0].opacity, 0);
    const [, startX, startY] = transformNumbers(flight.wrapperFrames[0].transform);
    assert.equal(startX + source.to.width / 2, flight.from.x);
    assert.equal(startY + source.to.height / 2, flight.from.y);
  }
});

test('56 photographs complete landing and reveal in one second without extending stagger', () => {
  assert.equal(archiveLandingTime(56), 900);
  assert.equal(archiveLandingTime(56) + REVEAL_DURATION, 1000);
  for (const count of [1, 17, 18, 19, 56, 112]) {
    const first = createArchiveFlight(source, 0, count, viewport);
    const last = createArchiveFlight(source, count - 1, count, viewport);
    assert.equal(first.delay, 0);
    assert.ok(last.delay <= MAX_STAGGER);
    assert.equal(last.delay + FLIGHT_DURATION, archiveLandingTime(count));
  }
});

test('visible 4:3 image crop preserves cover proportions through the aspect change', () => {
  const flight = createArchiveFlight(source, 0, 56, viewport);
  for (const index of [0, flight.imageFrames.length - 1]) {
    const [, , , , sx, sy] = transformNumbers(flight.wrapperFrames[index].transform);
    const [imageX, imageY] = transformNumbers(flight.imageFrames[index].transform);
    const visibleAspect = source.to.width * sx / (source.to.height * sy);
    const displayedAspect = visibleAspect * imageX / imageY;
    assert.ok(imageX >= 1 && imageY >= 1, 'the crop must cover the frame');
    assert.ok(Math.abs(displayedAspect - source.imageAspect) < .002, 'source image proportions remain intact');
  }
});
