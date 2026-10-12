import { useEffect } from 'react';
import { ArrowUpRight } from 'lucide-react';
import { categories, projects } from './portfolio';
import './works.css';

const headings = {
  work: ['WORK', 'PROJECT'],
  academic: ['ACADEMIC', 'PROJECT'],
  aigc: ['AIGC &', 'MODELLING'],
  other: ['OTHER', 'WORKS'],
};

export default function WorksPage({ onOpen }) {
  useEffect(() => {
    // Warm the ring's shared thumbnails without interrupting native scrolling.
    const warm = () => {
      for (const src of new Set(projects.map(project => project.thumbnail))) {
        const image = new Image();
        image.decoding = 'async';
        image.src = src;
        image.decode?.().catch(() => {});
      }
    };
    if ('requestIdleCallback' in window) {
      const idle = window.requestIdleCallback(warm, { timeout: 800 });
      return () => window.cancelIdleCallback(idle);
    }
    const timer = window.setTimeout(warm, 160);
    return () => window.clearTimeout(timer);
  }, []);

  return <div className="works-index page-inner">
    <div className="work-category-list">
      {categories.map(category => <section key={category.id} id={`works-${category.id}`} data-category={category.id} className="work-category" aria-labelledby={`works-heading-${category.id}`}>
        <div className="work-category-intro">
          <h3 id={`works-heading-${category.id}`}>{headings[category.id].map(line => <span key={line}>{line}</span>)}</h3>
        </div>
        <div className="work-image-grid">
          {projects.filter(project => project.category === category.id).map(project => <button key={project.id} data-project-id={project.id} data-archive-src={project.thumbnail} className="work-thumbnail" onClick={() => onOpen(project)} aria-label={`View ${project.title}`}>
            <img src={project.thumbnail} srcSet={`${project.thumbnail} ${project.thumbnailWidth || 480}w, ${project.image} ${project.imageWidth || 1400}w`} sizes="(max-width: 540px) 30vw, (max-width: 900px) 22vw, 230px" alt={project.gallery ? `${project.title} — project cover ${project.coverNumber || '01'}` : `${project.title} — architectural photography placeholder`} style={{ objectPosition: project.position }} loading="lazy" draggable="false" />
            <span className="work-thumbnail-label">{project.title}</span>
            <span className="work-thumbnail-open" aria-hidden="true"><ArrowUpRight size={14} /></span>
          </button>)}
        </div>
      </section>)}
    </div>
  </div>;
}
