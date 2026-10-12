import { useLayoutEffect, useMemo, useRef } from 'react';
import { archiveLandingTime, createArchiveFlight, FLIGHT_DURATION, REVEAL_DURATION } from './archiveKeyframes';
import './archiveTransition.css';

export default function ArchiveTransition({ flights, viewport, documentTop, onReveal, onComplete }) {
  const overlayRef = useRef(null);
  const callbacksRef = useRef({ onReveal, onComplete });
  callbacksRef.current = { onReveal, onComplete };
  const sequence = useMemo(
    () => flights.map((flight, index) => createArchiveFlight(flight, index, flights.length, viewport)),
    [flights, viewport.width, viewport.height],
  );
  const landingTime = archiveLandingTime(sequence.length);

  useLayoutEffect(() => {
    const overlay = overlayRef.current;
    if (!overlay) return undefined;
    const animations = [];
    const timers = [];
    let kickoff = 0;
    let disposed = false;
    let revealed = false;
    let completed = false;
    const later = (callback, delay) => {
      timers.push(window.setTimeout(() => { if (!disposed) callback(); }, delay));
    };
    const complete = () => {
      if (disposed || completed) return;
      completed = true;
      overlay.dataset.phase = 'complete';
      callbacksRef.current.onComplete?.();
    };
    const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    const reveal = () => {
      if (disposed || revealed) return;
      revealed = true;
      overlay.dataset.phase = 'revealing';
      callbacksRef.current.onReveal?.();
      if (reducedMotion || !overlay.animate) {
        complete();
        return;
      }
      animations.push(overlay.animate([{ opacity: 1 }, { opacity: 0 }], {
        duration: REVEAL_DURATION,
        easing: 'ease-out',
        fill: 'forwards',
      }));
      later(complete, REVEAL_DURATION);
    };

    if (reducedMotion || !overlay.animate || !sequence.length) {
      // Let StrictMode clean up its first effect before invoking callbacks.
      later(reveal, 0);
    } else {
      // Let the preview's StrictMode probe cancel before allocating GPU
      // animations, and give the fixed-size image layers one paint to settle.
      kickoff = requestAnimationFrame(() => {
        if (disposed) return;
        overlay.dataset.phase = 'flying';
        const elements = overlay.querySelectorAll('.archive-flight');
        sequence.forEach((flight, index) => {
          const element = elements[index];
          const plane = element.querySelector('.archive-flight__plane');
          const timing = {
            duration: FLIGHT_DURATION,
            delay: flight.delay,
            easing: 'cubic-bezier(.32, .08, .18, 1)',
            fill: 'both',
          };
          animations.push(element.animate(flight.wrapperFrames, timing));
          animations.push(plane.animate(flight.planeFrames, timing));
          if (flight.imageFrames) animations.push(element.querySelector('img').animate(flight.imageFrames, timing));
        });
        // Two sequence-level timers, regardless of the number of photographs.
        later(reveal, landingTime);
      });
    }

    return () => {
      disposed = true;
      cancelAnimationFrame(kickoff);
      timers.forEach(window.clearTimeout);
      animations.forEach(animation => animation.cancel());
    };
  }, [sequence, landingTime]);

  return (
    <div
      ref={overlayRef}
      className={`archive-transition${documentTop == null ? '' : ' archive-transition--document'}`}
      aria-hidden="true"
      data-phase="preparing"
      data-flight-count={sequence.length}
      data-landing-ms={landingTime}
      data-duration-ms={landingTime + REVEAL_DURATION}
      style={{ left: documentTop == null ? viewport.left : 0, top: documentTop ?? viewport.top, width: viewport.width, height: viewport.height }}
    >
      {sequence.map(flight => (
        <div
          key={flight.id}
          className="archive-flight"
          data-project-id={flight.projectId || flight.id}
          data-slot={flight.slot || flight.id}
          data-duplicate={flight.duplicate ? 'true' : 'false'}
          data-delay-ms={flight.delay}
          data-visible-source={flight.from.visible ? 'true' : 'false'}
          style={{
            width: flight.to.width,
            height: flight.to.height,
            transform: flight.wrapperFrames[0].transform,
            opacity: flight.wrapperFrames[0].opacity,
            zIndex: Math.round(flight.to.depth),
            perspective: `${flight.to.perspective}px`,
            perspectiveOrigin: flight.to.perspectiveOrigin,
          }}
        >
          <div className="archive-flight__plane">
            <img
              src={flight.src}
              alt=""
              draggable="false"
              className={flight.imageFrames ? 'archive-flight__morph-image' : undefined}
              style={{
                objectPosition: flight.position || 'center',
                transformOrigin: flight.position || 'center',
                transform: flight.imageFrames?.[0].transform,
              }}
            />
          </div>
        </div>
      ))}
    </div>
  );
}
