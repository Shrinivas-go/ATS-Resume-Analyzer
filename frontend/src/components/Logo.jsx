import { Link } from 'react-router-dom';
import './Logo.css';

/** Wordmark: a sheet with one highlighted line, then "ATS" in the display face. */
export default function Logo({ to = '/' }) {
  return (
    <Link to={to} className="logo" aria-label="ATS Resume Checker, home">
      <svg className="logo__mark" viewBox="0 0 22 28" aria-hidden="true">
        <path d="M1 1h14l6 6v20H1z" fill="var(--bg-2)" stroke="var(--ink)" strokeWidth="1.5" />
        <path d="M15 1v6h6" fill="none" stroke="var(--ink)" strokeWidth="1.5" />
        <rect x="4" y="12" width="13" height="4" fill="var(--accent)" />
        <path d="M5 14h11M5 20h8" stroke="var(--ink)" strokeWidth="1.5" />
        <ellipse cx="9" cy="20" rx="6.5" ry="3" fill="none" stroke="var(--signal)" strokeWidth="1.2" transform="rotate(-6 9 20)" />
      </svg>
      <span className="logo__word">ATS</span>
      <span className="logo__sub">resume checker</span>
    </Link>
  );
}
