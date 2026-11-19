import { useEffect, useState } from 'react';

/** The steps the backend runs, in order (backend/index.js → /api/analyze). */
const STEPS = [
  'Extracting text from the PDF',
  'Finding contact details and skills',
  'Splitting the posting into required and preferred skills',
  'ats-scorer is scoring five dimensions',
  'Lining up the results',
];

/** Loading state: a sheet with a highlighter-coloured scan line passing over it. */
export default function Scanning({ fileName }) {
  const [n, setN] = useState(0);
  useEffect(() => {
    const id = setInterval(() => setN((v) => Math.min(v + 1, STEPS.length - 1)), 900);
    return () => clearInterval(id);
  }, []);

  return (
    <div className="scanning" role="status" aria-live="polite">
      <div className="scanning__sheet sheet" aria-hidden="true">
        <span className="scanning__beam" />
        <span className="scanning__l" style={{ width: '42%', height: 18 }} />
        <span className="scanning__l" style={{ width: '70%' }} />
        <span className="scanning__l" style={{ width: '88%' }} />
        <span className="scanning__l" style={{ width: '64%' }} />
        <span className="scanning__gap" />
        <span className="scanning__l" style={{ width: '30%', height: 12 }} />
        <span className="scanning__l" style={{ width: '92%' }} />
        <span className="scanning__l" style={{ width: '81%' }} />
        <span className="scanning__l" style={{ width: '86%' }} />
        <span className="scanning__l" style={{ width: '58%' }} />
        <span className="scanning__gap" />
        <span className="scanning__l" style={{ width: '34%', height: 12 }} />
        <span className="scanning__l" style={{ width: '77%' }} />
        <span className="scanning__l" style={{ width: '69%' }} />
      </div>
      <div className="scanning__log">
        <p className="label">{fileName || 'resume.pdf'}</p>
        <ol>
          {STEPS.map((s, i) => (
            <li key={s} className={i < n ? 'is-done' : i === n ? 'is-now' : ''}>
              <span className="label">{String(i + 1).padStart(2, '0')}</span> {s}
            </li>
          ))}
        </ol>
      </div>
    </div>
  );
}
