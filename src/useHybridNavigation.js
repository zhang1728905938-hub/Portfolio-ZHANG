import { useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react';
import { captureArchiveSource, resolveArchiveFlights } from './archiveTransition';
import { wheelIntent } from './pageNavigation';
import { returnScrollIntent } from './returnScrollIntent';
import { useArchiveFrameStats } from './useArchiveFrameStats';

const reducedMotion = () => window.matchMedia('(prefers-reduced-motion: reduce)').matches;
const scrollBehavior = () => reducedMotion() ? 'instant' : 'smooth';
const atBottom = element => element.scrollTop + element.clientHeight >= element.scrollHeight - 3;
const freshGesture = () => ({ last: -Infinity, wheelAt: -Infinity, consumed: false, pageTurned: false, total: 0 });

export function useHybridNavigation(disabled) {
  const mainRef = useRef(null);
  const flowRef = useRef(null);
  const contactRef = useRef(null);
  // Fixed only while arriving. After landing the same Contact DOM becomes
  // document content, keeping upward wheel/touch/keyboard scrolling native.
  const [view, setView] = useState('works');
  const contactOpen = view === 'contact';
  const contactFlow = view === 'return';
  const [contactVisible, setContactVisible] = useState(false);
  const [location, setLocation] = useState({ activeSection: 0, category: 'work' });
  const [archive, setArchive] = useState(null);
  const busy = useRef(false);
  const pendingAlignment = useRef(null);
  const gesture = useRef(freshGesture());
  const returnIntent = useRef({ armed: false });
  const navigationSync = useRef(null);
  const options = useRef(null);
  options.current = { view, disabled };
  useArchiveFrameStats(Boolean(archive), mainRef);

  const complete = useCallback(() => {
    busy.current = false;
    setArchive(null);
  }, []);
  const reveal = useCallback(() => {
    setArchive(current => current ? { ...current, phase: 'revealing' } : null);
  }, []);

  const enterContact = useCallback(() => {
    if (options.current.view === 'contact' || busy.current) return;
    const flow = flowRef.current;
    const contact = contactRef.current;
    if (!flow || !contact) return;
    const rootStyle = getComputedStyle(document.documentElement);
    const top = parseFloat(rootStyle.getPropertyValue('--header'));
    const bottom = window.innerHeight - parseFloat(rootStyle.getPropertyValue('--footer'));
    // In return flow the destination remains the original fixed viewport.
    const bounds = { left: 0, top, bottom, width: document.documentElement.clientWidth, height: bottom - top };
    const snapshot = captureArchiveSource(flow, bounds);
    contact.scrollTop = 0;
    gesture.current = { ...freshGesture(), last: performance.now(), consumed: true, pageTurned: true };
    returnIntent.current.armed = false;
    busy.current = !reducedMotion();
    setArchive(busy.current ? { phase: 'preparing', snapshot } : null);
    setView('contact');
  }, []);

  const releaseContact = useCallback(target => {
    const contact = contactRef.current;
    pendingAlignment.current = { top: contact.getBoundingClientRect().top, scrollTop: contact.scrollTop, target };
    complete();
    gesture.current = freshGesture();
    returnIntent.current.armed = false;
    setContactVisible(true);
    setLocation(current => ({ ...current, activeSection: 2 }));
    setView('return');
  }, [complete]);

  useLayoutEffect(() => {
    if (archive?.phase !== 'preparing') return;
    const flights = resolveArchiveFlights(archive.snapshot, contactRef.current);
    if (!flights.length) { complete(); return; }
    setArchive({ phase: 'flying', flights, viewport: archive.snapshot.viewport });
  }, [archive, complete]);

  useLayoutEffect(() => {
    if (contactOpen && !archive && !busy.current) releaseContact();
  }, [contactOpen, archive, releaseContact]);

  useLayoutEffect(() => {
    if (!contactFlow || !pendingAlignment.current) return;
    const { top, scrollTop, target } = pendingAlignment.current;
    pendingAlignment.current = null;
    const contact = contactRef.current;
    const documentTop = contact.getBoundingClientRect().top + window.scrollY;
    contact.scrollTop = 0;
    // Compensate before paint: same ring, same screen coordinates, no reverse flight.
    window.scrollTo({ top: documentTop - top + scrollTop, behavior: 'instant' });
    if (target) flowRef.current.querySelector(`#${target}`)?.scrollIntoView({ block: 'start', behavior: scrollBehavior() });
  }, [contactFlow]);

  const scrollToFlow = useCallback(id => {
    if (options.current.view === 'contact') { releaseContact(id); return; }
    flowRef.current?.querySelector(`#${id}`)?.scrollIntoView({ block: 'start', behavior: scrollBehavior() });
  }, [releaseContact]);
  const scrollToSection = useCallback(index => {
    if (index !== 2) { scrollToFlow(index === 1 ? 'works-work' : 'about'); return; }
    const contact = contactRef.current;
    if (options.current.view === 'return' && !returnIntent.current.armed) {
      contact.scrollIntoView({ block: 'start', behavior: scrollBehavior() });
    } else enterContact();
  }, [enterContact, scrollToFlow]);
  const scrollToCategory = useCallback(id => scrollToFlow(`works-${id}`), [scrollToFlow]);

  useEffect(() => {
    const flow = flowRef.current;
    const works = flow.querySelector('#works');
    const contact = contactRef.current;
    const groups = [...flow.querySelectorAll('[data-category]')];
    const header = document.querySelector('.site-header');
    let previousY = window.scrollY;
    let frame = 0;
    const update = () => {
      frame = 0;
      const delta = window.scrollY - previousY;
      previousY = window.scrollY;
      if (options.current.view === 'contact') return;
      const headerBottom = header?.getBoundingClientRect().bottom || 80;
      const threshold = headerBottom + Math.min(140, window.innerHeight * .2);
      const rect = contact.getBoundingClientRect();
      const inFlow = options.current.view === 'return';
      setContactVisible(inFlow && rect.bottom > headerBottom && rect.top < window.innerHeight);
      let activeSection = works.getBoundingClientRect().top <= threshold ? 1 : 0;
      if (inFlow && rect.top <= threshold) activeSection = 2;
      let category = groups[0]?.dataset.category || 'work';
      groups.forEach(group => { if (group.getBoundingClientRect().top <= threshold) category = group.dataset.category; });
      setLocation(current => current.activeSection === activeSection && current.category === category ? current : { activeSection, category });
      if (inFlow && returnScrollIntent(returnIntent.current, {
        delta, contactTop: rect.top, scrollTop: window.scrollY,
        viewportHeight: window.innerHeight,
        disabled: options.current.disabled || busy.current,
      })) enterContact();
    };
    const schedule = () => { if (!frame) frame = requestAnimationFrame(update); };
    const resized = () => { previousY = window.scrollY; schedule(); };
    navigationSync.current = resized;
    const resize = new ResizeObserver(resized);
    resize.observe(flow);
    resize.observe(contact);
    if (header) resize.observe(header);
    window.addEventListener('scroll', schedule, { passive: true });
    window.addEventListener('resize', resized);
    update();
    return () => {
      cancelAnimationFrame(frame);
      resize.disconnect();
      navigationSync.current = null;
      window.removeEventListener('scroll', schedule);
      window.removeEventListener('resize', resized);
    };
  }, [enterContact]);
  useEffect(() => { navigationSync.current?.(); }, [view]);

  // Only the initial forward boundary uses page-turn protection. After
  // landing reverse browsing has no wheel threshold or cooldown.
  useEffect(() => {
    const wheel = event => {
      if (options.current.disabled || event.ctrlKey || Math.abs(event.deltaX) > Math.abs(event.deltaY) || !event.deltaY) return;
      if (options.current.view === 'return') return;
      const delta = event.deltaY * (event.deltaMode === 1 ? 16 : event.deltaMode === 2 ? window.innerHeight : 1);
      const element = document.scrollingElement;
      const inside = delta > 0 ? !atBottom(element) : element.scrollTop > 3;
      const intent = wheelIntent(gesture.current, delta, performance.now(), inside);
      if (busy.current) {
        gesture.current.pageTurned = true;
        gesture.current.consumed = true;
        gesture.current.total = 0;
        event.preventDefault();
        return;
      }
      if (intent === 'scroll') return;
      event.preventDefault();
      if (intent === 1) enterContact();
    };
    const keydown = event => {
      if (options.current.disabled || event.defaultPrevented || event.altKey || event.ctrlKey || event.metaKey ||
          event.target.closest('input, textarea, select, [contenteditable="true"]') || options.current.view === 'return') return;
      const space = event.key === ' ' && !event.target.closest('button, a, summary');
      const scrollKey = ['ArrowDown', 'ArrowUp', 'PageDown', 'PageUp', 'Home', 'End'].includes(event.key) || space;
      if (busy.current && scrollKey) { event.preventDefault(); return; }
      const down = ['ArrowDown', 'PageDown'].includes(event.key) || (space && !event.shiftKey);
      if (down && atBottom(document.scrollingElement) && !event.repeat) { event.preventDefault(); enterContact(); }
    };
    let touch = null;
    const touchstart = event => {
      if (options.current.disabled || options.current.view === 'return' || event.touches.length !== 1) { touch = null; return; }
      const point = event.touches[0];
      touch = { x: point.clientX, y: point.clientY, atEnd: atBottom(document.scrollingElement), blocked: busy.current };
    };
    const touchmove = event => {
      if (!touch || options.current.disabled || options.current.view === 'return' || event.touches.length !== 1) return;
      const dx = touch.x - event.touches[0].clientX;
      const dy = touch.y - event.touches[0].clientY;
      if (Math.abs(dy) <= Math.abs(dx)) return;
      if (busy.current || (touch.atEnd && dy > 0)) event.preventDefault();
    };
    const touchend = event => {
      const start = touch;
      touch = null;
      if (!start || start.blocked || busy.current || options.current.disabled || options.current.view === 'return' || !event.changedTouches.length) return;
      const dx = start.x - event.changedTouches[0].clientX;
      const dy = start.y - event.changedTouches[0].clientY;
      if (start.atEnd && dy > 50 && dy > Math.abs(dx)) enterContact();
    };
    const touchcancel = () => { touch = null; };
    window.addEventListener('wheel', wheel, { passive: false });
    window.addEventListener('keydown', keydown);
    window.addEventListener('touchstart', touchstart, { passive: true });
    window.addEventListener('touchmove', touchmove, { passive: false });
    window.addEventListener('touchend', touchend);
    window.addEventListener('touchcancel', touchcancel);
    return () => {
      window.removeEventListener('wheel', wheel);
      window.removeEventListener('keydown', keydown);
      window.removeEventListener('touchstart', touchstart);
      window.removeEventListener('touchmove', touchmove);
      window.removeEventListener('touchend', touchend);
      window.removeEventListener('touchcancel', touchcancel);
    };
  }, [enterContact]);

  useEffect(() => {
    const motion = window.matchMedia('(prefers-reduced-motion: reduce)');
    const hidden = () => { if (document.hidden) complete(); };
    window.addEventListener('resize', complete);
    document.addEventListener('visibilitychange', hidden);
    motion.addEventListener('change', complete);
    return () => {
      window.removeEventListener('resize', complete);
      document.removeEventListener('visibilitychange', hidden);
      motion.removeEventListener('change', complete);
    };
  }, [complete]);

  return { mainRef, flowRef, contactRef, contactOpen, contactFlow, contactVisible, ...location, activeSection: contactOpen ? 2 : location.activeSection, archive, reveal, complete, scrollToSection, scrollToCategory };
}
