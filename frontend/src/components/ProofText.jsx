import { useMemo } from 'react';
import { markupSegments } from '../lib/markup';
import './ProofText.css';

/**
 * The signature: a block of posting text with the parser's marks on it.
 * Found skills get a highlighter stroke, missing ones a red-pencil ring.
 * Marks animate in order once `play` is true (CSS, driven by --d).
 */
export default function ProofText({ text, hits = [], misses = [], play = true, step = 140, start = 200 }) {
  const segments = useMemo(() => markupSegments(text, hits, misses), [text, hits, misses]);

  let n = 0;
  return (
    <p className={`proof-text ${play ? 'is-playing' : ''}`}>
      {segments.map((seg, i) => {
        if (!seg.kind) return <span key={i}>{seg.text}</span>;
        const d = `${start + Math.min(n++, 40) * step}ms`;
        if (seg.kind === 'hit') {
          return (
            <mark key={i} className="mk mk--hit" style={{ '--d': d }}>
              {seg.text}
              <span className="sr-only"> (found in your resume)</span>
            </mark>
          );
        }
        return (
          <mark key={i} className="mk mk--miss" style={{ '--d': d }}>
            {seg.text}
            <svg className="mk__ring" viewBox="0 0 100 40" preserveAspectRatio="none" aria-hidden="true">
              <path pathLength="1" d="M8 22C6 10 30 4 52 4s44 5 43 17c-1 12-26 16-48 16S5 33 6 22c0-6 8-11 20-13" />
            </svg>
            <span className="sr-only"> (missing from your resume)</span>
          </mark>
        );
      })}
    </p>
  );
}
