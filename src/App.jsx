import { useCallback, useEffect, useState } from 'react';
import { ArrowUpRight, Plus, X, Pause, Play, Sun, Moon, Phone, Mail } from 'lucide-react';
import { categories, profile, ringImages } from './portfolio';
import { useSpatialRing } from './useSpatialRing';
import WorksPage from './WorksPage';
import ProjectDetail from './ProjectDetail.jsx';
import AboutPage from './AboutPage.jsx';
import { useTheme } from './useTheme';
import { useHybridNavigation } from './useHybridNavigation';
import ArchiveTransition from './ArchiveTransition.jsx';

const sectionNames = ['Intro', 'Works', 'Contact'];

function ContactPage({ onOpen, active, archiving }) {
  const [paused, setPaused] = useState(false);
  const [pointerCard, setPointerCard] = useState(null);
  const [focusedCard, setFocusedCard] = useState(null);
  const hovered = focusedCard || pointerCard;
  const clearInspection = useCallback(() => { setPointerCard(null); setFocusedCard(null); }, []);
  useEffect(() => { if (!active) clearInspection(); }, [active, clearInspection]);
  const ringRef = useSpatialRing({ active, manualPaused: paused, inspecting: Boolean(hovered), itemCount: ringImages.length, clearInspection });
  return <div className="contact-layout spatial-contact page-inner">
    <div className="ring-top-space" aria-hidden="true" />
    <div className="spatial-ring-scene">
      <div ref={ringRef} className="spatial-ring" inert={archiving || undefined} onPointerLeave={() => setPointerCard(null)}>
        {ringImages.map(({ id, project }, index) => <div className="spatial-ring-item" key={id} data-project-id={project.id} data-ring-slot={id}
          onPointerEnter={event => { if (event.pointerType !== 'touch') setPointerCard(id); }}
          onPointerLeave={() => setPointerCard(current => current === id ? null : current)}>
          <button className={`orbit-card spatial-ring-card ${hovered === id ? 'hovered' : ''}`}
            onFocus={event => { if (event.currentTarget.matches(':focus-visible')) setFocusedCard(id); }}
            onBlur={() => setFocusedCard(null)} onClick={() => onOpen(project)} aria-label={`View ${project.title}, image ${index + 1} of ${ringImages.length}`}>
            <img src={project.thumbnail} alt={project.title} style={{ objectPosition: project.position }} loading="lazy" draggable="false" />
            <span><span className="orbit-card-title">{project.title}</span><ArrowUpRight size={12} /></span>
          </button>
        </div>)}
      </div>
    </div>
    <section className="contact-reach" aria-labelledby="contact-heading">
      <h2 id="contact-heading">CONTACT&nbsp;&nbsp;&nbsp;ME</h2>
      <div className="contact-reach-links">
        {[
          { label: 'TEL', value: profile.phone, href: profile.phone ? `tel:${profile.phone.replace(/[^\d+]/g, '')}` : null, Icon: Phone },
          { label: 'EMAIL', value: profile.email, href: profile.email ? `mailto:${profile.email}` : null, Icon: Mail },
        ].map(({ label, value, href, Icon }) => {
          const Tag = href ? 'a' : 'span';
          return <Tag key={label} className="contact-reach-item" href={href || undefined}>
            <Icon size={14} strokeWidth={1.4} aria-hidden="true" />
            <span className="contact-reach-text">{label}：{value && <> <span className="contact-reach-value">{value}</span></>}</span>
          </Tag>;
        })}
      </div>
    </section>
    <div className="contact-bottom"><span>{hovered ? ringImages.find(image => image.id === hovered)?.project.title : 'Every project is a new connection.'}</span><button className="orbit-toggle" onClick={() => setPaused(!paused)} aria-label={paused ? 'Resume orbit rotation' : 'Pause orbit rotation'}>{paused ? <Play size={12} /> : <Pause size={12} />}{paused ? 'RESUME ORBIT' : 'PAUSE TO LOOK CLOSER'}</button></div>
  </div>;
}

export default function App() {
  const { theme, toggleTheme } = useTheme();
  const [modal, setModal] = useState(null);
  const [menuOpen, setMenuOpen] = useState(false);
  const { mainRef, flowRef, contactRef, activeSection, category, contactOpen, contactFlow, contactVisible, archive, reveal, complete, scrollToSection, scrollToCategory } = useHybridNavigation(Boolean(modal) || menuOpen);

  useEffect(() => {
    const wideScreen = window.matchMedia('(min-width: 681px)');
    const closeMobileMenu = event => { if (event.matches) setMenuOpen(false); };
    wideScreen.addEventListener('change', closeMobileMenu);
    return () => wideScreen.removeEventListener('change', closeMobileMenu);
  }, []);

  useEffect(() => {
    if (!menuOpen) return;
    const closeOnEscape = event => { if (event.key === 'Escape') setMenuOpen(false); };
    window.addEventListener('keydown', closeOnEscape);
    return () => window.removeEventListener('keydown', closeOnEscape);
  }, [menuOpen]);

  const goTo = index => { setMenuOpen(false); scrollToSection(index); };
  const selectCategory = id => { setMenuOpen(false); scrollToCategory(id); };
  const openProject = project => setModal({ type: 'project', project });

  return <>
    <header className="site-header"><div className="header-inner"><button className="wordmark" onClick={() => goTo(0)} aria-label="Rui Zhang Portfolio, home"><span className="brand-name">RUI ZHANG<span className="brand-period">.</span></span><span className="brand-subtitle">PORTFOLIO</span></button><nav className={menuOpen ? 'main-nav mobile-open' : 'main-nav'} aria-label="Main navigation" id="main-navigation">{categories.map(item => <button key={item.id} className={activeSection === 1 && category === item.id ? 'nav-active' : ''} aria-current={activeSection === 1 && category === item.id ? 'location' : undefined} onClick={() => selectCategory(item.id)}>{item.label}</button>)}</nav><button type="button" className="header-contact theme-toggle" onClick={toggleTheme} aria-label={theme === 'dark' ? 'Switch to light theme' : 'Switch to dark theme'} aria-pressed={theme === 'dark'} title={theme === 'dark' ? '切换至白色主题' : '切换至黑色主题'}>{theme === 'dark' ? <Sun size={19} /> : <Moon size={19} />}</button><button className="menu-toggle circle-button" aria-label={menuOpen ? 'Close navigation' : 'Open navigation'} aria-expanded={menuOpen} aria-controls="main-navigation" onClick={() => setMenuOpen(!menuOpen)}>{menuOpen ? <X size={18} /> : <Plus size={20} />}</button></div></header>
    <main className={`hybrid-page${contactOpen ? ' is-contact-view' : ''}${contactFlow ? ' is-contact-flow' : ''}${archive ? ' is-archiving' : ''}${archive?.phase === 'revealing' ? ' is-archive-revealing' : ''}`} ref={mainRef}>
      <div className="continuous-page" ref={flowRef} inert={contactOpen || undefined} aria-hidden={contactOpen || undefined}>
        <section id="about" className="page-section" aria-label="About Rui Zhang"><AboutPage active={activeSection === 0 && !contactOpen && !archive && !modal && !menuOpen} /></section>
        <section id="works" className="page-section" aria-label="Selected works"><WorksPage onOpen={openProject} /></section>
      </div>
      <section ref={contactRef} id="contact" className="contact-page page-section" aria-label="Contact" inert={!(contactOpen || contactFlow) || Boolean(archive) || undefined} aria-hidden={!(contactOpen || contactFlow) || undefined}>
        <ContactPage onOpen={openProject} active={(contactOpen || contactVisible) && !modal && !archive} archiving={Boolean(archive)} />
      </section>
      {archive?.flights && <ArchiveTransition flights={archive.flights} viewport={archive.viewport} onReveal={reveal} onComplete={complete} />}
    </main>
    <aside className="page-rail" aria-label="Section navigation">{sectionNames.map((name, i) => <button key={name} className={activeSection === i ? 'active' : ''} onClick={() => goTo(i)} aria-label={`Go to ${name}`} aria-current={activeSection === i ? 'location' : undefined}><span /></button>)}</aside>
    <footer className="site-footer"><div className="footer-inner"><span className="copyright">© 2026 RUI ZHANG<span className="footer-note">DESIGNED WITH INTENTION.</span></span><nav className="page-switcher glass" aria-label="Sections">{sectionNames.map((name, i) => <button key={name} className={activeSection === i ? 'active' : ''} onClick={() => goTo(i)} aria-current={activeSection === i ? 'location' : undefined}><span>0{i + 1}</span><span>{name}</span></button>)}</nav></div></footer>
    <ProjectDetail project={modal?.project} onClose={() => setModal(null)} />
  </>;
}

