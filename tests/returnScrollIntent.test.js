import test from 'node:test';
import assert from 'node:assert/strict';
import { returnScrollIntent } from '../src/returnScrollIntent.js';

const intent = (state, values) => returnScrollIntent(state, {
  viewportHeight: 800,
  ...values,
});

test('repeated browsing below the document top never replays', () => {
  const state = { armed: false };
  for (let cycle = 0; cycle < 30; cycle += 1) {
    for (const scrollTop of [2300, 1900, 1500, 1000, 650, 300, 1.01]) {
      assert.equal(intent(state, { delta: -100, contactTop: 2400 - scrollTop, scrollTop }), false);
      assert.equal(state.armed, false);
    }
    for (const scrollTop of [300, 650, 1000, 1500, 1900, 2300]) {
      assert.equal(intent(state, { delta: 100, contactTop: 2400 - scrollTop, scrollTop }), false);
      assert.equal(state.armed, false);
    }
  }
});

test('returning to Work Project or the middle of About still leaves browsing native', () => {
  const state = { armed: false };
  // Work starts at 650 px, while 300 px is within About in this document.
  for (const scrollTop of [650, 300]) {
    assert.equal(intent(state, { delta: -100, contactTop: 2400 - scrollTop, scrollTop }), false);
    assert.equal(state.armed, false);
  }
  assert.equal(intent(state, { delta: 1400, contactTop: 700, scrollTop: 1700 }), false);
  assert.equal(state.armed, false);
});

test('returning to the document top arms one forward replay', () => {
  const state = { armed: false };
  assert.equal(intent(state, { delta: -100, contactTop: 2400, scrollTop: 0 }), false);
  assert.equal(state.armed, true);
  for (const contactTop of [1600, 1200, 800.5]) {
    assert.equal(intent(state, { delta: 100, contactTop, scrollTop: 2400 - contactTop }), false);
    assert.equal(state.armed, true, 'the replay waits until Contact enters the viewport');
  }
  assert.equal(intent(state, { delta: 0.5, contactTop: 800, scrollTop: 1600 }), true);
  assert.equal(state.armed, false);
  for (const contactTop of [700, 400, 84]) {
    assert.equal(intent(state, { delta: 100, contactTop, scrollTop: 2400 - contactTop }), false);
  }
});

test('the top allows one pixel of rounding and negative overscroll', () => {
  for (const scrollTop of [1, 0.5, -1, -30]) {
    const state = { armed: false };
    assert.equal(intent(state, { delta: -1, contactTop: 2400 - scrollTop, scrollTop }), false);
    assert.equal(state.armed, true);
    assert.equal(intent(state, { delta: 100, contactTop: 790, scrollTop: 1610 }), true);
    assert.equal(state.armed, false);
  }
});

test('every later replay requires another return to the document top', () => {
  const state = { armed: false };
  for (let cycle = 0; cycle < 3; cycle += 1) {
    assert.equal(intent(state, { delta: -100, contactTop: 2100, scrollTop: 300 }), false);
    assert.equal(intent(state, { delta: 100, contactTop: 700, scrollTop: 1700 }), false);
    assert.equal(state.armed, false);
    assert.equal(intent(state, { delta: -100, contactTop: 2400, scrollTop: 0 }), false);
    assert.equal(state.armed, true);
    assert.equal(intent(state, { delta: 100, contactTop: 790, scrollTop: 1610 }), true);
    assert.equal(state.armed, false);
  }
});

test('disabled interaction neither arms nor consumes a pending replay', () => {
  const state = { armed: false };
  assert.equal(intent(state, { delta: -100, contactTop: 2400, scrollTop: 0, disabled: true }), false);
  assert.equal(state.armed, false);
  assert.equal(intent(state, { delta: -100, contactTop: 2400, scrollTop: 0 }), false);
  assert.equal(state.armed, true);
  assert.equal(intent(state, { delta: 100, contactTop: 700, scrollTop: 1700, disabled: true }), false);
  assert.equal(state.armed, true);
  assert.equal(intent(state, { delta: 100, contactTop: 600, scrollTop: 1800 }), true);
});

test('stationary or downward layout checks cannot arm a replay', () => {
  const state = { armed: false };
  for (const delta of [0, 1]) {
    assert.equal(intent(state, { delta, contactTop: 2400, scrollTop: 0 }), false);
    assert.equal(state.armed, false);
  }
  state.armed = true;
  assert.equal(intent(state, { delta: 0, contactTop: 500, scrollTop: 1900 }), false);
  assert.equal(state.armed, true);
});

test('a missing or invalid document scroll position cannot rearm the animation', () => {
  for (const scrollTop of [undefined, null, NaN, Infinity, -Infinity]) {
    const state = { armed: false };
    assert.equal(intent(state, { delta: -100, contactTop: 2400, scrollTop }), false);
    assert.equal(state.armed, false);
    assert.equal(intent(state, { delta: 100, contactTop: 700, scrollTop }), false);
  }
});

test('mobile also requires the document top and waits for its shorter viewport', () => {
  const state = { armed: false };
  const mobile = values => intent(state, { viewportHeight: 600, ...values });
  assert.equal(mobile({ delta: -100, contactTop: 1398, scrollTop: 2 }), false);
  assert.equal(state.armed, false);
  assert.equal(mobile({ delta: -1, contactTop: 1399, scrollTop: 1 }), false);
  assert.equal(state.armed, true);
  assert.equal(mobile({ delta: 100, contactTop: 600.5, scrollTop: 799.5 }), false);
  assert.equal(state.armed, true);
  assert.equal(mobile({ delta: 0.5, contactTop: 600, scrollTop: 800 }), true);
  assert.equal(state.armed, false);
});
