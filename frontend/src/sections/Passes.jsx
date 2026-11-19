import { passes } from '../content/landing';
import { useReveal } from '../lib/useReveal';
import './sections.css';

export default function Passes() {
  const ref = useReveal();
  return (
    <section id="passes" className="sec passes" ref={ref} aria-labelledby="passes-title">
      <div className="wrap">
        <header className="sec__head sec__head--row">
          <p className="label label--loud sec__index" data-reveal>02 — How it works</p>
          <h2 id="passes-title" className="display sec__title" data-reveal style={{ '--i': 1 }}>
            Three passes, <em>one report.</em>
          </h2>
        </header>

        <ol className="passes__list">
          {passes.map((p, i) => (
            <li key={p.n} className="pass" data-reveal style={{ '--i': i }}>
              <span className="pass__n display">{p.n}</span>
              <div>
                <h3 className="pass__title">{p.title}</h3>
                <p className="pass__body">{p.body}</p>
                <p className="hand pass__note" aria-hidden="true">{p.note}</p>
              </div>
            </li>
          ))}
        </ol>
      </div>
    </section>
  );
}
