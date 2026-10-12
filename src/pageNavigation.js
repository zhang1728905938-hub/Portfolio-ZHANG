// A gesture belongs either to the current page's scroll or to a page turn.
// Keep page-turn inertia away from the incoming page until the gesture ends.
export function wheelIntent(state, delta, now, canScrollInside) {
  const gap = now - state.wheelAt;
  state.wheelAt = now;
  if (gap > 220) {
    state.consumed = false;
    state.pageTurned = false;
    state.total = 0;
  }
  if (now - state.last < 1000) {
    state.pageTurned = true;
    state.consumed = true;
    state.total = 0;
  }
  if (state.pageTurned) return 'hold';
  if (canScrollInside) {
    state.consumed = true;
    state.total = 0;
    return 'scroll';
  }
  if (state.consumed) return 'hold';
  if (Math.sign(state.total) !== Math.sign(delta)) state.total = 0;
  state.total += delta;
  if (Math.abs(state.total) <= 35) return 'hold';
  state.consumed = true;
  state.pageTurned = true;
  return Math.sign(state.total);
}
