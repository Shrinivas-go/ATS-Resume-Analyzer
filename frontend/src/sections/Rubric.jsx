import { useState } from 'react';
import { modelFacts, pointsEach, rubric } from '../content/landing';
import { useReveal } from '../lib/useReveal';
import './sections.css';

const total = pointsEach * rubric.length;
const ticks = Array.from({ length: rubric.length + 1 }, (_, i) => i * pointsEach);

/**
 * The score, opened up. The equal weighting is said once (title + one ruler);
 * each row carries what actually differs between dimensions: how far the model's
 * score usually lands from the true one.
 */
export default function Rubric() {
  const ref = useReveal();
  const [active, setActive] = useState(0);

  return (
    <section id="checks" className="sec rubric" ref={ref} aria-labelledby="checks-title">
      <div className="wrap">
        <header className="sec__head">
          <p className="label label--loud sec__index" data-reveal>01 — The checks</p>
          <h2 id="checks-title" className="display sec__title" data-reveal style={{ '--i': 1 }}>
            Five dimensions, <em>one number.</em>
          </h2>
          <p className="sec__intro" data-reveal style={{ '--i': 2 }}>
            Each is worth {pointsEach} of the {total} points, scored by ats-scorer, a model trained on
            {' '}{modelFacts.trainedOn}. Then ats-lm explains every score in plain words.
          </p>
        </header>

        <figure className="rubric__scale" data-reveal aria-hidden="true">
          <div className="rubric__bar">
            {rubric.map((r, i) => (
              <span key={r.name} style={{ '--i': i }} className={i === active ? 'is-on' : ''}>
                <b>{r.short}</b>
              </span>
            ))}
          </div>
          <div className="rubric__ticks">
            {ticks.map((t) => <i key={t}>{t}</i>)}
          </div>
        </figure>

        <p className="label rubric__key" data-reveal>Typical miss, out of {pointsEach}</p>
        <ol className="rubric__rows">
          {rubric.map((r, i) => (
            <li
              key={r.name}
              className="rubric__row"
              data-on={i === active || undefined}
              data-reveal
              style={{ '--i': i % 4 }}
              onMouseEnter={() => setActive(i)}
              onFocus={() => setActive(i)}
              tabIndex={0}
            >
              <div className="rubric__err">
                <span className="rubric__mae">
                  <small>±</small>{r.mae.toFixed(1)}
                </span>
                <span
                  className="rubric__meter"
                  style={{ '--band': `${(r.mae * 2 / pointsEach) * 100}%` }}
                  aria-hidden="true"
                />
              </div>
              <h3 className="rubric__name">{r.name}</h3>
              <p className="rubric__what">
                {r.what}
                <span className="sr-only"> Model's average miss: {r.mae} of {pointsEach} points.</span>
              </p>
            </li>
          ))}
        </ol>

        <p className="label rubric__foot" data-reveal>
          Tested on {modelFacts.testedOn}
          {modelFacts.mae != null ? ` · total off by ${modelFacts.mae} of ${total} on average` : ''}
          {modelFacts.baselineMae != null ? ` · guessing the average would be off by ${modelFacts.baselineMae}` : ''}
        </p>
      </div>
    </section>
  );
}
