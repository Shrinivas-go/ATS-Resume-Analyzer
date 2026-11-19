import Icon from '../components/Icon';
import { useReveal } from '../lib/useReveal';
import './sections.css';

export default function Finale({ onAction, actionLabel }) {
  const ref = useReveal();
  return (
    <section className="sec finale" ref={ref} aria-labelledby="finale-title">
      <div className="wrap finale__in">
        <h2 id="finale-title" className="display finale__title" data-reveal>
          See the marks <em>before</em> they do.
        </h2>
        <div className="finale__act" data-reveal style={{ '--i': 1 }}>
          <button type="button" className="btn btn--ink" onClick={onAction}>
            {actionLabel} <Icon name="arrow" />
          </button>
          <p className="label">One PDF · one posting · free</p>
        </div>
      </div>
    </section>
  );
}
