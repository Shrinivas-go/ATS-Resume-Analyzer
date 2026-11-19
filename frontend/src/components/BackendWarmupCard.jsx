import { useEffect, useRef, useState } from 'react';
import Icon from './Icon';
import '../styles/BackendWarmupCard.css';

/** Rotating lines while the Render free-tier backend wakes up. */
const STATUS = [
  'Sending a wake-up request',
  'Server is starting',
  'Connecting to the database',
  'Loading the skill lists',
  'Nearly there',
];
const ROTATE_MS = 3000;
const READY_DISMISS_MS = 1200;

/**
 * Cold-start overlay. Covers the viewport, or the dialog it is placed in
 * (a transformed parent becomes its containing block).
 */
export default function BackendWarmupCard({ isReady, isChecking, onReady }) {
  const [i, setI] = useState(0);
  const [faqOpen, setFaqOpen] = useState(false);
  const [exiting, setExiting] = useState(false);
  const [dismissed, setDismissed] = useState(false);
  const timer = useRef(null);

  useEffect(() => {
    if (isReady) return;
    const id = setInterval(() => setI((n) => Math.min(n + 1, STATUS.length - 1)), ROTATE_MS);
    return () => clearInterval(id);
  }, [isReady]);

  useEffect(() => {
    if (!isReady) return;
    timer.current = setTimeout(() => {
      setExiting(true);
      setTimeout(() => {
        setDismissed(true);
        onReady?.();
      }, 450);
    }, READY_DISMISS_MS);
    return () => clearTimeout(timer.current);
  }, [isReady, onReady]);

  if (dismissed || (!isChecking && !isReady)) return null;

  return (
    <div className={`warm ${exiting ? 'warm--out' : ''}`} role="status" aria-live="polite">
      <div className="warm__card">
        <p className="label">Server status</p>
        <h2 className="display warm__title">
          {isReady ? (
            <>Parser is <em>ready.</em></>
          ) : (
            <>Warming up <em>the parser.</em></>
          )}
        </h2>

        <div className={`warm__bar ${isReady ? 'is-ready' : ''}`} aria-hidden="true">
          <span />
        </div>

        <ol className="warm__log">
          {(isReady ? [...STATUS.slice(0, i + 1), 'Ready'] : STATUS.slice(0, i + 1)).map((s, n, arr) => (
            <li key={s} className={n === arr.length - 1 ? 'is-now' : ''}>
              <span className="label">{String(n + 1).padStart(2, '0')}</span>
              {s}
              {n < arr.length - 1 || isReady ? <Icon name="check" /> : <span className="warm__dots" />}
            </li>
          ))}
        </ol>

        {!isReady && (
          <>
            <p className="warm__note">The first visit can take up to a minute while the server starts.</p>
            <button type="button" className="warm__faq" onClick={() => setFaqOpen((v) => !v)} aria-expanded={faqOpen}>
              Why does this happen? <Icon name="chevron" className={faqOpen ? 'is-open' : ''} />
            </button>
            {faqOpen && (
              <p className="warm__faq-body">
                The backend runs on Render’s free tier, which puts it to sleep after a while
                with no traffic. Opening the app wakes it up; after that it responds normally.
              </p>
            )}
          </>
        )}
      </div>
    </div>
  );
}
