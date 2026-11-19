import { useEffect, useState } from 'react';
import NumberFlow from '@number-flow/react';
import ProofText from '../ProofText';
import Icon from '../Icon';
import { tierFor } from '../../lib/tiers';
import { useReview } from '../../hooks/useReview';

/** Five dimension bars from ats-scorer; each reason fills in when the ats-lm review arrives. */
function Dimensions({ dimensions, review, play }) {
  const reasons = Object.fromEntries((review?.review?.dimensions || []).map((d) => [d.name, d.reason]));
  const writing = review?.status === 'pending';
  return (
    <ol className="dims">
      {dimensions.map((d) => (
        <li key={d.name} className="dim">
          <div className="dim__top">
            <h3 className="dim__name">{d.label}</h3>
            <p className="dim__score"><b>{d.score}</b><span>/{d.max || 20}</span></p>
          </div>
          <div className="dim__bar" aria-hidden="true">
            <span style={{ width: play ? `${(d.score / (d.max || 20)) * 100}%` : 0 }} className={d.score <= 8 ? 'is-low' : ''} />
          </div>
          {reasons[d.name] ? (
            <p className="dim__why">{reasons[d.name]}</p>
          ) : writing ? (
            <p className="dim__why dim__why--wait"><span className="ghost-line" /><span className="ghost-line ghost-line--short" /></p>
          ) : null}
        </li>
      ))}
    </ol>
  );
}

function Profile({ profile }) {
  if (!profile) return null;
  const rows = [
    ['Current title', profile.current_title],
    ['Experience', profile.years_experience != null ? `${profile.years_experience} year${Number(profile.years_experience) === 1 ? '' : 's'}` : null],
    ['Seniority', profile.seniority],
    ['Domain', profile.primary_domain],
  ].filter(([, v]) => v);
  const skills = [...(profile.core_skills || []), ...(profile.tools || [])].slice(0, 14);
  return (
    <section className="res__block">
      <header className="res__bhead">
        <h2 className="res__h">How ats-lm reads your resume</h2>
        <p className="label">Parsed profile</p>
      </header>
      <div className="res__meta">
        <dl className="contact">
          {rows.map(([k, v]) => (
            <div key={k}><dt className="label">{k}</dt><dd>{String(v)}</dd></div>
          ))}
        </dl>
        <div>
          {skills.length > 0 && <><p className="label res__sub">Skills it picked out</p><Chips items={skills} kind="plain" /></>}
          {profile.key_achievements?.length > 0 && (
            <>
              <p className="label res__sub">Achievements it noticed</p>
              <ol className="notes">
                {profile.key_achievements.slice(0, 4).map((t, i) => (
                  <li key={i}><span className="label">{String(i + 1).padStart(2, '0')}</span>{t}</li>
                ))}
              </ol>
            </>
          )}
        </div>
      </div>
    </section>
  );
}

function Chips({ items, kind }) {
  if (!items?.length) return null;
  return (
    <ul className={`chips chips--${kind}`}>
      {items.map((s) => (
        <li key={s}>{s}</li>
      ))}
    </ul>
  );
}

export default function Results({ result, jobDescription, onDownload, onNewScan }) {
  const [score, setScore] = useState(0);
  const [play, setPlay] = useState(false);
  const review = useReview(result.reviewId, result.savedReview);

  useEffect(() => {
    const a = setTimeout(() => setScore(result.score), 250);
    const b = setTimeout(() => setPlay(true), 600);
    return () => { clearTimeout(a); clearTimeout(b); };
  }, [result.score]);

  const s = result.skillsAnalyzed || {};
  const matchedCore = s.matchedCore || [];
  const missingCore = s.missingCore || [];
  const matchedOpt = s.matchedOptional || [];
  const missingOpt = s.missingOptional || [];
  const found = [...matchedCore, ...matchedOpt];
  const missing = [...missingCore, ...missingOpt];
  const tier = tierFor(result.score);
  const details = result.details || {};
  const confidence = Math.round((result.predictionConfidence || 0) * 100);
  const contact = result.contactInfo || {};

  return (
    <div className="res">
      {/* ── Score ── */}
      <section className="res__top">
        <div className="res__score">
          <p className="label">Match score</p>
          <p className="res__num">
            <NumberFlow value={score} />
            <span className="res__of">/100</span>
          </p>
        </div>
        <div className="res__verdict">
          <p className="res__tier display">{details.matchTier || tier.name}</p>
          <p className="hand res__hand">{tier.note}</p>
          {result.jobTitle && (
            <p className="label res__for">
              For: {result.jobTitle}
              {result.fileName ? ` · ${result.fileName}` : ''}
            </p>
          )}
          <p className="res__summary">
            {review.review?.summary || details.summary}
          </p>
          <p className="label res__engine">
            {result.engine === 'ats-scorer'
              ? review.status === 'pending'
                ? 'Scored by ats-scorer · ats-lm is writing the review…'
                : review.review
                  ? 'Scored by ats-scorer · reviewed by ats-lm'
                  : 'Scored by ats-scorer · written review unavailable'
              : 'Scored by the rules engine (model service unavailable)'}
          </p>
          <div className="res__actions">
            <button type="button" className="btn btn--ink" onClick={() => onDownload(review)}>
              <Icon name="download" /> PDF report
            </button>
            <button type="button" className="btn btn--text" onClick={onNewScan}>
              Scan a new version
            </button>
          </div>
        </div>
      </section>

      {/* ── Dimension scores (ats-scorer) + reasons (ats-lm) ── */}
      {result.dimensions?.length === 5 && (
        <section className="res__block">
          <header className="res__bhead">
            <h2 className="res__h">Five dimensions</h2>
            <p className="label">0–20 each · total {result.score}/100</p>
          </header>
          <Dimensions dimensions={result.dimensions} review={review} play={play} />
        </section>
      )}

      {/* ── The marked-up posting ── */}
      {jobDescription ? (
        <section className="res__block">
          <header className="res__bhead">
            <h2 className="res__h">Your posting, marked up</h2>
            <p className="res__legend label">
              <span><i className="sw sw--hit" /> {found.length} in your resume</span>
              <span><i className="sw sw--miss" /> {missing.length} missing</span>
            </p>
          </header>
          <div className="sheet res__proof">
            <ProofText text={jobDescription} hits={found} misses={missing} play={play} step={70} start={0} />
          </div>
        </section>
      ) : null}

      {/* ── Skills ── */}
      <section className="res__block res__skills">
        <div>
          <h2 className="res__h">
            Found <span className="res__count">{found.length}</span>
          </h2>
          {found.length === 0 && <p className="res__none">No skills from the posting were found in your resume text.</p>}
          {matchedCore.length > 0 && <p className="label res__sub">Required</p>}
          <Chips items={matchedCore} kind="hit" />
          {matchedOpt.length > 0 && <p className="label res__sub">Preferred</p>}
          <Chips items={matchedOpt} kind="hit" />
        </div>
        <div>
          <h2 className="res__h">
            Missing <span className="res__count res__count--miss">{missing.length}</span>
          </h2>
          {missing.length === 0 && <p className="res__none">Nothing missing. Every skill in the posting appears in your resume.</p>}
          {missingCore.length > 0 && <p className="label res__sub">Required</p>}
          <Chips items={missingCore} kind="miss" />
          {missingOpt.length > 0 && <p className="label res__sub">Preferred</p>}
          <Chips items={missingOpt} kind="miss" />
        </div>
      </section>

      {/* ── Notes ── */}
      <section className="res__block res__notes">
        <div>
          <h2 className="res__h">Working for you</h2>
          {details.keyStrengths?.length ? (
            <ol className="notes">
              {details.keyStrengths.map((t, i) => (
                <li key={i}><span className="label">{String(i + 1).padStart(2, '0')}</span>{t}</li>
              ))}
            </ol>
          ) : (
            <p className="res__none">No strengths stood out. A more detailed posting gives the checker more to match.</p>
          )}
        </div>
        <div>
          <h2 className="res__h res__h--fix">Fix before you send</h2>
          {details.criticalGaps?.length ? (
            <ol className="notes notes--fix">
              {details.criticalGaps.map((t, i) => (
                <li key={i}><span className="label">{String(i + 1).padStart(2, '0')}</span>{t}</li>
              ))}
            </ol>
          ) : (
            <p className="res__none">No critical gaps found.</p>
          )}
        </div>
      </section>

      <Profile profile={review.profile} />

      {/* ── Reads as + contact ── */}
      <section className="res__block res__meta">
        <div className="res__field">
          <h2 className="res__h">Reads as</h2>
          <p className="display res__cat">{result.predictedCategory || 'General / Unknown'}</p>
          {confidence > 0 && (
            <div className="res__conf">
              <div className="res__conf-bar" aria-hidden="true">
                <span style={{ width: play ? `${confidence}%` : 0 }} />
              </div>
              <p className="label">Parse confidence {confidence}%</p>
            </div>
          )}
          <p className="res__fine">
            If this isn’t the field you’re applying to, your resume may be using another
            field’s vocabulary.
          </p>
        </div>
        <div>
          <h2 className="res__h">Contact details found</h2>
          <dl className="contact">
            {[
              ['Email', contact.email],
              ['Phone', contact.phone],
              ['LinkedIn', contact.linkedin],
              ['GitHub', contact.github],
            ].map(([k, v]) => (
              <div key={k} className={v ? '' : 'is-missing'}>
                <dt className="label">{k}</dt>
                <dd>
                  {v ? (
                    k === 'LinkedIn' || k === 'GitHub' ? (
                      <a href={v.startsWith('http') ? v : `https://${v}`} target="_blank" rel="noreferrer">{v.replace(/^https?:\/\//, '')}</a>
                    ) : v
                  ) : 'Not found'}
                </dd>
              </div>
            ))}
          </dl>
        </div>
      </section>
    </div>
  );
}
