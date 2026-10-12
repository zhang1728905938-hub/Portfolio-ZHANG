import AboutVideoBackground from './AboutVideoBackground.jsx';
import './resume.css';

export default function AboutPage({ active = true }) {
  return <article className="resume-page" aria-label="Rui Zhang portfolio films">
    <AboutVideoBackground active={active} />
    <h1 className="sr-only">Rui Zhang — Portfolio</h1>
  </article>;
}
