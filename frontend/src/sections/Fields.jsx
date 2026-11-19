import { fields } from '../content/landing';
import { useReveal } from '../lib/useReveal';
import './sections.css';

/** Graphite inverse section: the fields the classifier can name. */
export default function Fields() {
  const ref = useReveal();
  return (
    <section id="fields" className="sec fields" ref={ref} aria-labelledby="fields-title">
      <div className="wrap fields__grid">
        <header className="fields__head">
          <p className="label label--loud sec__index" data-reveal>03 — Reads as</p>
          <h2 id="fields-title" className="display sec__title" data-reveal style={{ '--i': 1 }}>
            Which field does it <em>think</em> you’re in?
          </h2>
          <p className="sec__intro" data-reveal style={{ '--i': 2 }}>
            A keyword classifier counts field-specific terms in your resume and names the
            strongest of eleven fields. If it names the wrong one, your resume is speaking
            a different language from the job.
          </p>
        </header>

        <ol className="fields__list">
          {fields.map((f, i) => (
            <li key={f} data-reveal style={{ '--i': i % 6 }}>
              <span className="label">{String(i + 1).padStart(2, '0')}</span>
              <span className="fields__name">{f}</span>
            </li>
          ))}
        </ol>
      </div>
    </section>
  );
}
