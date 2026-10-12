import { useEffect, useRef, useState } from 'react';
import { Pause, Play } from 'lucide-react';
import { aboutPosterPath, aboutVideoPaths } from './aboutMedia.js';
import { publicAssetUrl } from './publicAssetUrl.js';
import './aboutVideo.css';

const VIDEOS = aboutVideoPaths.map(path => publicAssetUrl(path));
const POSTER = publicAssetUrl(aboutPosterPath);
const FADE_MS = 720;

export default function AboutVideoBackground({ active = true }) {
  const containerRef = useRef(null);
  const videoRefs = useRef([]);
  const controllerRef = useRef(null);
  const [visible, setVisible] = useState(false);
  const [hidden, setHidden] = useState(() => document.hidden);
  const [paused, setPaused] = useState(() => window.matchMedia('(prefers-reduced-motion: reduce)').matches);
  const [blocked, setBlocked] = useState(false);
  const [unavailable, setUnavailable] = useState(false);
  const [frontSlot, setFrontSlot] = useState(-1);
  const [previousSlot, setPreviousSlot] = useState(-1);
  const [currentIndex, setCurrentIndex] = useState(0);

  useEffect(() => {
    const container = containerRef.current;
    const observer = new IntersectionObserver(([entry]) => setVisible(entry.isIntersecting), { threshold: 0 });
    observer.observe(container);
    const onVisibility = () => setHidden(document.hidden);
    const motion = window.matchMedia('(prefers-reduced-motion: reduce)');
    const onMotion = () => { if (motion.matches) setPaused(true); };
    document.addEventListener('visibilitychange', onVisibility);
    motion.addEventListener('change', onMotion);
    return () => {
      observer.disconnect();
      document.removeEventListener('visibilitychange', onVisibility);
      motion.removeEventListener('change', onMotion);
    };
  }, []);

  useEffect(() => {
    const videos = [...videoRefs.current];
    const slots = [{ index: 0, generation: 0 }, { index: 1, generation: 0 }];
    const failed = new Set();
    let alive = true;
    let allowed = false;
    let front = -1;
    let desired = 0;
    let fadeTimer = 0;
    const playRequests = new Map();

    const nextIndex = index => {
      for (let offset = 1; offset <= VIDEOS.length; offset += 1) {
        const candidate = (index + offset) % VIDEOS.length;
        if (!failed.has(candidate)) return candidate;
      }
      return -1;
    };
    const pauseAll = () => videos.forEach(video => video.pause());

    const requestPlay = slot => {
      if (!alive || !allowed || failed.size === VIDEOS.length || playRequests.has(slot)) return;
      const video = videos[slot];
      const generation = slots[slot].generation;
      const request = video.play();
      playRequests.set(slot, request);
      request.catch(error => {
        if (!alive || generation !== slots[slot].generation || !allowed || error.name === 'AbortError') return;
        // An autoplay policy rejection leaves a usable, explicit play button.
        if (error.name === 'NotAllowedError') {
          allowed = false;
          pauseAll();
          setBlocked(true);
        }
      }).finally(() => {
        if (playRequests.get(slot) === request) playRequests.delete(slot);
      });
    };

    const loadSlot = (slot, index) => {
      const video = videos[slot];
      slots[slot].index = index;
      slots[slot].generation += 1;
      playRequests.delete(slot);
      video.pause();
      video.preload = allowed ? 'auto' : 'metadata';
      video.src = VIDEOS[index];
      video.load();
    };

    const advance = () => {
      const current = front < 0 ? desired : front;
      const next = nextIndex(slots[current].index);
      if (next < 0) return;
      desired = 1 - current;
      if (slots[desired].index !== next || videos[desired].ended) loadSlot(desired, next);
      requestPlay(desired);
    };

    videos.forEach((video, slot) => {
      video.oncanplay = () => { if (slot === desired) requestPlay(slot); };
      video.onplaying = () => {
        if (!alive || !allowed || slot !== desired) { video.pause(); return; }
        if (front === slot) return;
        const previous = front;
        front = slot;
        setPreviousSlot(previous);
        setFrontSlot(slot);
        setCurrentIndex(slots[slot].index);
        setBlocked(false);
        clearTimeout(fadeTimer);
        // Keep the preceding final frame until the incoming clip is playing.
        // Only two media elements exist, and only the incoming one plays.
        if (previous >= 0) videos[previous].pause();
        fadeTimer = window.setTimeout(() => {
          if (!alive || front !== slot) return;
          setPreviousSlot(-1);
          const next = nextIndex(slots[slot].index);
          if (next >= 0 && (slots[1 - slot].index !== next || videos[1 - slot].ended)) loadSlot(1 - slot, next);
        }, FADE_MS);
      };
      video.onended = () => { if (slot === front) advance(); };
      video.onerror = () => {
        if (!alive) return;
        failed.add(slots[slot].index);
        const next = nextIndex(slots[slot].index);
        if (next < 0) {
          allowed = false;
          pauseAll();
          setUnavailable(true);
          return;
        }
        if (slot === front || slot === desired) {
          desired = front < 0 ? slot : 1 - front;
          loadSlot(desired, next);
          requestPlay(desired);
        } else {
          loadSlot(slot, next);
        }
      };
    });

    loadSlot(0, 0);
    loadSlot(1, 1);
    const setAllowed = value => {
      allowed = value;
      videos.forEach(video => { video.preload = value ? 'auto' : 'metadata'; });
      if (!value) { pauseAll(); return; }
      if (front >= 0 && videos[front].ended && desired === front) advance();
      else requestPlay(desired);
    };
    controllerRef.current = {
      setAllowed,
      resume: value => {
        if (failed.size === VIDEOS.length) {
          failed.clear();
          front = -1;
          desired = 0;
          setFrontSlot(-1);
          setPreviousSlot(-1);
          setUnavailable(false);
          loadSlot(0, 0);
          loadSlot(1, 1);
        }
        setAllowed(value);
      },
    };
    return () => {
      alive = false;
      clearTimeout(fadeTimer);
      controllerRef.current = null;
      videos.forEach(video => {
        video.oncanplay = null;
        video.onplaying = null;
        video.onended = null;
        video.onerror = null;
        video.pause();
        video.removeAttribute('src');
        video.load();
      });
    };
  }, []);

  useEffect(() => {
    controllerRef.current?.setAllowed(active && visible && !hidden && !paused && !blocked && !unavailable);
  }, [active, visible, hidden, paused, blocked, unavailable]);

  const stopped = paused || blocked || unavailable;
  const togglePlayback = () => {
    if (stopped) {
      setPaused(false);
      setBlocked(false);
      controllerRef.current?.resume(active && visible && !hidden);
    } else {
      setPaused(true);
      controllerRef.current?.setAllowed(false);
    }
  };

  return (
    <div ref={containerRef} className="about-video" style={{ '--about-video-poster': `url(${JSON.stringify(POSTER)})` }}>
      <div className="about-video__media" aria-hidden="true">
        {[0, 1].map(slot => (
          <video
            key={slot}
            ref={element => { videoRefs.current[slot] = element; }}
            className={`about-video__layer${frontSlot === slot ? ' is-current' : previousSlot === slot ? ' is-previous' : ''}`}
            muted
            playsInline
            preload="metadata"
            poster={POSTER}
            disablePictureInPicture
            tabIndex={-1}
          />
        ))}
      </div>
      <div className="about-video__controls">
        <button
          type="button"
          className="about-video__toggle"
          onClick={togglePlayback}
          aria-label={stopped ? 'Play background videos' : 'Pause background videos'}
          title={stopped ? 'Play background videos' : 'Pause background videos'}
        >
          {stopped ? <Play size={12} strokeWidth={1.5} /> : <Pause size={12} strokeWidth={1.5} />}
        </button>
        <span className="about-video__count" aria-hidden="true">{String(currentIndex + 1).padStart(2, '0')}<span> / {String(VIDEOS.length).padStart(2, '0')}</span></span>
      </div>
    </div>
  );
}
