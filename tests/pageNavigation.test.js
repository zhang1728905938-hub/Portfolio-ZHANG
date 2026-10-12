import test from 'node:test';
import assert from 'node:assert/strict';
import { wheelIntent } from '../src/pageNavigation.js';

const fresh = () => ({ last: 0, wheelAt: 0, consumed: false, pageTurned: false, total: 0 });

test('inertia reaching the end of a long page cannot immediately turn the page', () => {
  const gesture = fresh();
  assert.equal(wheelIntent(gesture, 150, 2000, true), 'scroll');
  assert.equal(wheelIntent(gesture, 120, 2040, true), 'scroll');
  assert.equal(wheelIntent(gesture, 85, 2090, false), 'hold');
  assert.equal(wheelIntent(gesture, 40, 2160, false), 'hold');
  assert.equal(wheelIntent(gesture, 90, 2500, false), 1);
});

test('the top boundary and reverse direction require a fresh gesture too', () => {
  const gesture = fresh();
  assert.equal(wheelIntent(gesture, -120, 2000, true), 'scroll');
  assert.equal(wheelIntent(gesture, -100, 2050, false), 'hold');
  assert.equal(wheelIntent(gesture, -100, 2400, false), -1);
});

test('small wheel deltas accumulate once and the page transition remains protected', () => {
  const gesture = fresh();
  assert.equal(wheelIntent(gesture, 20, 2000, false), 'hold');
  assert.equal(wheelIntent(gesture, 20, 2050, false), 1);
  gesture.last = 2050;
  assert.equal(wheelIntent(gesture, 100, 2100, false), 'hold');
  assert.equal(wheelIntent(gesture, 100, 2500, false), 'hold');
  assert.equal(wheelIntent(gesture, -100, 3200, false), -1);
});

test('wheel events after a page turn cannot scroll the incoming long page', () => {
  const gesture = fresh();
  assert.equal(wheelIntent(gesture, 120, 2000, false), 1);
  gesture.last = 2000;
  assert.equal(wheelIntent(gesture, 100, 2040, true), 'hold');
  assert.equal(wheelIntent(gesture, 75, 2080, true), 'hold');
});

test('page-turn inertia stays blocked beyond the navigation cooldown', () => {
  const gesture = fresh();
  assert.equal(wheelIntent(gesture, 120, 2000, false), 1);
  gesture.last = 2000;
  for (let now = 2100; now <= 3400; now += 100) {
    assert.equal(wheelIntent(gesture, 20, now, true), 'hold', `inertia at ${now}`);
  }
  assert.equal(wheelIntent(gesture, 120, 3700, true), 'scroll');
  assert.equal(wheelIntent(gesture, 60, 3750, true), 'scroll');
});

test('a fresh gesture during cooldown stays blocked until its own inertia ends', () => {
  const gesture = fresh();
  assert.equal(wheelIntent(gesture, 120, 2000, false), 1);
  gesture.last = 2000;
  assert.equal(wheelIntent(gesture, 100, 2900, true), 'hold');
  assert.equal(wheelIntent(gesture, 80, 3050, true), 'hold');
  assert.equal(wheelIntent(gesture, 50, 3200, true), 'hold');
  assert.equal(wheelIntent(gesture, 100, 3500, true), 'scroll');
});

test('navigation triggered without a wheel turn also protects the incoming page', () => {
  const gesture = fresh();
  gesture.last = 2000;
  assert.equal(wheelIntent(gesture, 100, 2850, true), 'hold');
  assert.equal(wheelIntent(gesture, 50, 3050, true), 'hold');
  assert.equal(wheelIntent(gesture, 100, 3350, true), 'scroll');
});
