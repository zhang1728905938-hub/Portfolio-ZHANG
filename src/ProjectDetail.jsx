import { useLayoutEffect, useRef, useState } from 'react';
import { Maximize2, Minus, Plus, X } from 'lucide-react';
import { categories } from './portfolio';
import './project-detail.css';

function isDialogBackdrop(event) {
  if (event.target !== event.currentTarget) return false;
  const bounds = event.currentTarget.getBoundingClientRect();
  return event.clientX < bounds.left || event.clientX > bounds.right
    || event.clientY < bounds.top || event.clientY > bounds.bottom;
}

function ImageViewer({ project, image, onClose }) {
  const dialogRef = useRef(null);

  useLayoutEffect(() => {
    const dialog = dialogRef.current;
    dialog.showModal();
    return () => dialog.close();
  }, []);

  return <dialog ref={dialogRef} className="project-image-viewer" aria-label={`${project.title} — full image`}
    onCancel={event => { event.preventDefault(); event.stopPropagation(); onClose(); }}>
    <button className="project-viewer-close" onClick={onClose} aria-label="Close full image" autoFocus><X size={22} /></button>
    <img src={image.fullSrc || image.src} alt={image.number ? `${project.title} — full image ${image.number}` : `${project.title} — full architectural photograph`} />
    <div className="project-viewer-caption"><span>{project.title}</span><span>{project.year}</span></div>
  </dialog>;
}

function ProjectContent({ project, onViewImage, onClose, closeRef }) {
  const [expanded, setExpanded] = useState(false);
  const category = categories.find(item => item.id === project.category);
  const description = project.description || '';
  const firstSentence = project.showFullDescription
    ? description
    : description.match(/^.*?[.!?](?:\s|$)/s)?.[0] || description;
  const remainingDescription = description.slice(firstSentence.length).trim();
  const hasMore = Boolean(remainingDescription || project.sample);
  const images = project.gallery?.length ? project.gallery : [{ src: project.image }];

  return <article className="project-detail-layout">
    <div className="project-detail-actions">
      <button ref={closeRef} className="project-detail-close" aria-label="Close project details" onClick={onClose} autoFocus><X size={21} strokeWidth={1.4} /></button>
      <button className="project-image-link" onClick={() => onViewImage(images[0])}><Maximize2 size={15} /><span>VIEW IMAGE</span></button>
    </div>
    <div className="project-information">
      <h2 id="project-detail-title">
        {project.title}
        {project.titleSubtitle && <span className="project-title-subtitle">{project.titleSubtitle}</span>}
        {project.titleZh && <span className="project-title-zh" lang="zh-CN">{project.titleZh}</span>}
      </h2>
      <div className="project-facts">
        <p>{project.categoryLabel || category?.label}</p>
        {project.subtitle && <p>{project.subtitle}</p>}
        {project.showYear !== false && project.year && <p>{project.year}</p>}
      </div>
      {(description || hasMore) && <div className="project-description">
        <p className="project-description-text">{firstSentence.trim()}</p>
        {hasMore && <>
          <div id="project-description-more" hidden={!expanded}>
            {remainingDescription && <p>{remainingDescription}</p>}
            {project.sample && <p className="project-sample-note">Illustrative project · Sample text and architectural photography for replacement.</p>}
          </div>
          <button className="project-read-more" aria-expanded={expanded} aria-controls="project-description-more" onClick={() => setExpanded(!expanded)}>
            {expanded ? 'READ LESS' : 'READ MORE'}{expanded ? <Minus size={16} /> : <Plus size={16} />}
          </button>
        </>}
      </div>}
    </div>
    <div className="project-photographs" role="region" aria-label="Project image gallery" tabIndex={images.length > 1 ? 0 : undefined}>
      {images.map((image, index) => <figure className={`project-photograph${image.height > image.width ? ' is-portrait' : ''}`} key={image.src} data-image-number={image.number} style={image.height > image.width ? { '--image-aspect': image.width / image.height } : undefined}>
        <button className="project-image-button" onClick={() => onViewImage(image)} aria-label={`Enlarge ${project.title} image${image.number ? ` ${image.number}` : ''}`}>
          <img src={image.src} width={image.width} height={image.height} alt={image.number ? `${project.title} — project image ${image.number}` : `${project.title} — architectural photography`} style={{ objectPosition: project.position }} loading={index === 0 ? 'eager' : 'lazy'} decoding="async" />
          <span className="project-image-expand" aria-hidden="true"><Maximize2 size={18} /></span>
        </button>
      </figure>)}
    </div>
  </article>;
}

export default function ProjectDetail({ project, onClose }) {
  const dialogRef = useRef(null);
  const scrollRef = useRef(null);
  const closeRef = useRef(null);
  const openerRef = useRef(null);
  const backdropPressRef = useRef(false);
  const [viewImage, setViewImage] = useState(null);

  useLayoutEffect(() => {
    const dialog = dialogRef.current;
    backdropPressRef.current = false;
    setViewImage(null);
    if (project) {
      if (!dialog.open) {
        openerRef.current = document.activeElement;
        dialog.showModal();
      }
      if (scrollRef.current) scrollRef.current.scrollTop = 0;
      const gallery = scrollRef.current?.querySelector('.project-photographs');
      if (gallery) gallery.scrollTop = 0;
      closeRef.current?.focus({ preventScroll: true });
    } else if (dialog.open) {
      dialog.close();
      openerRef.current?.focus({ preventScroll: true });
    }
  }, [project]);

  const closeProject = () => { setViewImage(null); onClose(); };

  return <dialog ref={dialogRef} className={`project-detail${project?.gallery?.length ? ' has-project-gallery' : ''}`} data-project-id={project?.id} data-category={project?.category} aria-labelledby={project ? 'project-detail-title' : undefined}
    onPointerDown={event => { backdropPressRef.current = event.button === 0 && isDialogBackdrop(event); }}
    onPointerCancel={() => { backdropPressRef.current = false; }}
    onClick={event => {
      // Dismiss only a click that both starts and ends outside the panel.
      const shouldClose = backdropPressRef.current && isDialogBackdrop(event);
      backdropPressRef.current = false;
      if (shouldClose) closeProject();
    }}
    onCancel={event => { event.preventDefault(); closeProject(); }}>
    {project && <>
      <div ref={scrollRef} className="project-detail-scroll">
        <ProjectContent key={project.id} project={project} onViewImage={setViewImage} onClose={closeProject} closeRef={closeRef} />
      </div>
      {viewImage && <ImageViewer project={project} image={viewImage} onClose={() => setViewImage(null)} />}
    </>}
  </dialog>;
}
