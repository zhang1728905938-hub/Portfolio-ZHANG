import test from 'node:test';
import assert from 'node:assert/strict';
import { RingMotion } from '../src/ringMotion.js';

const closeTo = (actual, expected, tolerance = 1e-8) => {
  assert.ok(Math.abs(actual - expected) < tolerance, actual + ' should be close to ' + expected);
};

test('autoplay rotates clockwise twenty percent faster than the previous 3.465 degrees per second', () => {
  const ring = new RingMotion(0);
  for (let frame = 1; frame <= 20; frame += 1) {
    const state = ring.step(.05, frame * 50);
    assert.equal(state.mode, 'running');
    assert.equal(state.needsFrame, true);
    assert.equal(state.moving, false);
  }
  closeTo(ring.phase, -3.465 * 1.2);
});

test('manual pause holds the displayed phase and resumes without resetting it', () => {
  const ring = new RingMotion(382);
  ring.step(.05, 50);
  const phase = ring.phase;
  const paused = ring.step(.05, 100, { manualPaused: true });
  assert.deepEqual(paused, { phase, mode: 'paused', moving: false, needsFrame: false });
  assert.equal(ring.step(.05, 5000, { manualPaused: true }).phase, phase);
  const resumed = ring.step(.02, 5020);
  assert.equal(resumed.mode, 'running');
  closeTo(resumed.phase, phase - .02 * 4.158);
});

test('photograph inspection holds the ring until hover or focus ends', () => {
  const ring = new RingMotion();
  const phase = ring.phase;
  const inspected = ring.step(.05, 50, { inspecting: true });
  assert.deepEqual(inspected, { phase, mode: 'inspecting', moving: false, needsFrame: false });
  assert.equal(ring.step(.05, 100, { inspecting: true }).phase, phase);
  closeTo(ring.step(.016, 116).phase, phase - .016 * 4.158);
});

test('ending photograph inspection preserves an explicit manual pause', () => {
  const ring = new RingMotion(10);
  assert.equal(ring.step(.05, 50, { inspecting: true, manualPaused: true }).mode, 'inspecting');
  const paused = ring.step(.05, 100, { manualPaused: true });
  assert.equal(paused.mode, 'paused');
  assert.equal(paused.needsFrame, false);
  assert.equal(paused.phase, 10);
});

test('inactive scenes do not advance and resume from the last displayed phase', () => {
  const ring = new RingMotion(0);
  ring.step(.016, 16);
  const phase = ring.phase;
  const inactive = ring.step(.05, 100, { active: false, inspecting: true });
  assert.deepEqual(inactive, { phase, mode: 'inactive', moving: false, needsFrame: false });
  assert.equal(ring.step(.05, 2000, { active: false }).phase, phase);
  closeTo(ring.step(.016, 2016).phase, phase - .016 * 4.158);
});

test('reduced motion prevents autoplay and resumes continuously when disabled', () => {
  const ring = new RingMotion(10);
  const paused = ring.step(.05, 50, { reducedMotion: true });
  assert.deepEqual(paused, { phase: 10, mode: 'paused', moving: false, needsFrame: false });
  assert.equal(ring.step(.05, 1000, { reducedMotion: true }).phase, 10);
  closeTo(ring.step(.02, 1020).phase, 10 - .02 * 4.158);
});

test('long frames are capped and invalid or negative frame durations cannot corrupt the phase', () => {
  const ring = new RingMotion(0);
  ring.step(2, 2000);
  closeTo(ring.phase, -.05 * 4.158);
  const phase = ring.phase;
  for (const dt of [-1, NaN, Infinity, -Infinity, undefined]) {
    assert.equal(ring.step(dt, 2001).phase, phase);
  }
});

test('autoplay covers the same angle at 30, 60 and 120 frames per second', () => {
  for (const fps of [30, 60, 120]) {
    const ring = new RingMotion(0);
    for (let frame = 1; frame <= fps * 2; frame += 1) {
      ring.step(1 / fps, frame * 1000 / fps);
    }
    closeTo(ring.phase, -8.316);
  }
});
