// A completed archive can replay only after returning to the document top.
// Allow one CSS pixel for fractional scroll positions at the top boundary.
export function returnScrollIntent(state, { delta, contactTop, scrollTop, viewportHeight, disabled = false }) {
  if (disabled) return false;
  if (delta < 0 && Number.isFinite(scrollTop) && scrollTop <= 1) state.armed = true;
  if (state.armed && delta > 0 && contactTop <= viewportHeight) {
    state.armed = false;
    return true;
  }
  return false;
}
