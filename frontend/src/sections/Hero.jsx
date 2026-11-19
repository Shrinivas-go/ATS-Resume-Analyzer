import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import NumberFlow from '@number-flow/react';
import { hero, samplePosting } from '../content/landing';
import ProofText from '../components/ProofText';
import Icon from '../components/Icon';
import { useInView } from '../lib/useReveal';
import './Hero.css';

const rise = {
  hidden: { y: '108%', rotate: 3 },
  show: (i) => ({ y: 0, rotate: 0, transition: { duration: 1.1, ease: [0.16, 1, 0.3, 1], delay: 0.15 + i * 0.09 } }),
};

export default function Hero({ onAction, actionLabel }) {
  const [sheetRef, seen] = useInView({ threshold: 0.35 });
  const [score, setScore] = useState(0);
  const step = 260;
  const marks = samplePosting.hits.length + samplePosting.misses.length;

  useEffect(() => {
    if (!seen) return;
    const t = setTimeout(() => setScore(samplePosting.score), 500 + marks * step);
    return () => clearTimeout(t);
  }, [seen, marks]);

  return (
    <section className="hero" aria-labelledby="hero-title">
      <div className="wrap hero__grid">
        <div className="hero__copy">
          <p className="hero__strip label">
            {hero.strip.map((s) => (
              <span key={s}>{s}</span>
            ))}
          </p>

          <h1 id="hero-title" className="display hero__title">
            <span className="hero__line"><motion.span variants={rise} initial="hidden" animate="show" custom={0}>A parser</motion.span></span>
            <span className="hero__line"><motion.span variants={rise} initial="hidden" animate="show" custom={1}>reads it</motion.span></span>
            <span className="hero__line hero__line--last">
              <motion.span variants={rise} initial="hidden" animate="show" custom={2}><em>first.</em></motion.span>
              <motion.span
                className="hand hero__aside"
                aria-hidden="true"
                initial={{ opacity: 0, x: -8 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 1.2, duration: 0.8 }}
              >
                then maybe a person
              </motion.span>
            </span>
          </h1>

          <motion.div
            className="hero__body"
            initial={{ opacity: 0, y: 18 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.55, duration: 1, ease: [0.16, 1, 0.3, 1] }}
          >
            <p className="hero__lead">{hero.lead}</p>
            <div className="hero__ctas">
              <button type="button" className="btn btn--ink" onClick={onAction}>
                {actionLabel} <Icon name="arrow" />
              </button>
              <a href="#checks" className="btn btn--text">How the score works</a>
            </div>
            <dl className="hero__facts">
              {hero.facts.map((f) => (
                <div key={f.k}>
                  <dt className="label">{f.k}</dt>
                  <dd>{f.v}</dd>
                </div>
              ))}
            </dl>
          </motion.div>
        </div>

        <motion.figure
          ref={sheetRef}
          className="sheet hero__sheet"
          initial={{ opacity: 0, y: 40, rotate: 1.2 }}
          animate={{ opacity: 1, y: 0, rotate: 0.6 }}
          transition={{ delay: 0.35, duration: 1.2, ease: [0.16, 1, 0.3, 1] }}
          aria-label="Example: a job posting marked up by the checker"
        >
          <div className="sheet__head">
            <span className="label">Job posting</span>
            <span className="label sheet__tag">{samplePosting.meta}</span>
          </div>
          <div className="sheet__body">
            <div className="sheet__main">
              <h2 className="sheet__title">{samplePosting.title}</h2>
              <ProofText
                text={samplePosting.text}
                hits={samplePosting.hits}
                misses={samplePosting.misses}
                play={seen}
                step={step}
                start={400}
              />
            </div>
            <aside className="sheet__margin" aria-label="Sample result">
              <p className="label">Score</p>
              <p className="sheet__score">
                <NumberFlow value={score} />
              </p>
              <p className="hand sheet__note sheet__note--hit" style={{ opacity: score ? 1 : 0 }}>
                {samplePosting.hits.length} found
              </p>
              <p className="hand sheet__note" style={{ opacity: score ? 1 : 0 }}>
                {samplePosting.misses.length} missing, add if true
              </p>
            </aside>
          </div>
          <figcaption className="sheet__legend">
            <span><i className="sw sw--hit" /> in your resume</span>
            <span><i className="sw sw--miss" /> missing</span>
          </figcaption>
        </motion.figure>
      </div>

      <a href="#checks" className="hero__hint label" aria-label="Scroll to the checks">
        <Icon name="arrowDown" /> Eight checks below
      </a>
    </section>
  );
}
