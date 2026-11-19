import { modelFacts, rubric } from '../content/landing';
import { useReveal } from '../lib/useReveal';
import './sections.css';

/** The score, opened up: five model-scored dimensions as a typeset table with a drawn bar. */
export default function Rubric() {
  const ref = useReveal();
  return (
    <section id="checks" className="sec rubric" ref={ref} aria-labelledby="checks-title">
      <div className="wrap">
        <header className="sec__head">
          <p className="label label--loud sec__index" data-reveal>01 — The checks</p>
          <h2 id="checks-title" className="display sec__title" data-reveal style={{ '--i': 1 }}>
            Five dimensions, <em>one number.</em>
          </h2>
          <p className="sec__intro" data-reveal style={{ '--i': 2 }}>
            Each dimension is scored 0–20 by ats-scorer, a model trained on
            {' '}{modelFacts.trainedOn}. Then ats-lm explains every score in plain words.
          </p>
        </header>

        <div className="rubric__bar" data-reveal aria-hidden="true">
          {rubric.map((r, i) => (
            <span key={r.name} style={{ flexGrow: r.w, '--i': i }} className={i === 0 ? 'is-lead' : ''}>
              <b>{r.w}</b>
            </span>
          ))}
        </div>

        <ol className="rubric__rows">
          {rubric.map((r, i) => (
            <li key={r.name} className="rubric__row" data-reveal style={{ '--i': i % 4 }}>
              <span className="rubric__w">
                {r.w}
                <small>%</small>
              </span>
              <h3 className="rubric__name">{r.name}</h3>
              <p className="rubric__what">{r.what}</p>
            </li>
          ))}
        </ol>

        <p className="label rubric__foot" data-reveal>
          Tested on {modelFacts.testedOn}
          {modelFacts.mae != null ? ` · average error ${modelFacts.mae} points out of 100` : ''}
        </p>
      </div>
    </section>
  );
}
