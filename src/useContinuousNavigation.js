import { useCallback, useEffect, useRef, useState } from 'react';

const sectionIds = ['about', 'works', 'contact'];

// Observe native document scrolling; navigation never consumes a wheel,
// touch, or keyboard event and never waits for a section transition.
export function useContinuousNavigation() {
  const mainRef = useRef(null);
  const [location, setLocation] = useState({ activeSection: 0, category: 'work' });
  const [contactVisible, setContactVisible] = useState(false);

  useEffect(() => {
    const main = mainRef.current;
    if (!main) return;
    const sections = sectionIds.map(id => main.querySelector(`#${id}`));
    const groups = [...main.querySelectorAll('[data-category]')];
    const header = document.querySelector('.site-header');
    let frame = 0;
    const update = () => {
      frame = 0;
      const headerBottom = header?.getBoundingClientRect().bottom || 80;
      const threshold = headerBottom + Math.min(140, window.innerHeight * .2);
      let activeSection = 0;
      sections.forEach((section, index) => {
        if (section.getBoundingClientRect().top <= threshold) activeSection = index;
      });
      if (window.scrollY + window.innerHeight >= document.documentElement.scrollHeight - 2) activeSection = 2;
      let category = groups[0]?.dataset.category || 'work';
      groups.forEach(group => {
        if (group.getBoundingClientRect().top <= threshold) category = group.dataset.category;
      });
      setLocation(current => current.activeSection === activeSection && current.category === category
        ? current : { activeSection, category });
    };
    const schedule = () => { if (!frame) frame = requestAnimationFrame(update); };
    const resize = new ResizeObserver(schedule);
    sections.forEach(section => resize.observe(section));
    if (header) resize.observe(header);
    const visibility = new IntersectionObserver(([entry]) => {
      setContactVisible(entry.isIntersecting);
    });
    visibility.observe(sections[2]);
    window.addEventListener('scroll', schedule, { passive: true });
    window.addEventListener('resize', schedule);
    update();
    return () => {
      cancelAnimationFrame(frame);
      resize.disconnect();
      visibility.disconnect();
      window.removeEventListener('scroll', schedule);
      window.removeEventListener('resize', schedule);
    };
  }, []);

  const scrollTo = useCallback(id => {
    const target = mainRef.current?.querySelector(`#${id}`);
    if (!target) return;
    target.scrollIntoView({
      block: 'start',
      behavior: window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 'instant' : 'smooth',
    });
  }, []);
  const scrollToSection = useCallback(index => {
    scrollTo(index === 1 ? 'works-work' : sectionIds[index]);
  }, [scrollTo]);
  const scrollToCategory = useCallback(id => scrollTo(`works-${id}`), [scrollTo]);

  return { mainRef, ...location, contactVisible, scrollToSection, scrollToCategory };
}
