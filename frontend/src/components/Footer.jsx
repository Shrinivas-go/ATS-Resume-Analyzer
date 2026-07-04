import React from 'react';
import { LogoIcon } from './Navbar';

export default function Footer() {
  return (
    <footer className="footer">
      <div className="container">
        <p style={{ marginBottom: '0.5rem', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem' }}>
          <LogoIcon size={20} />
          <span style={{ fontWeight: '600' }}>ATS Checker</span>
          <span style={{ color: 'var(--text-light)' }}>—</span>
          a side project for matching resumes to job descriptions.
        </p>
        <p style={{ fontSize: '0.8rem', color: 'var(--text-light)' }}>
          © {new Date().getFullYear()} · Built with Express, React & a Logistic Regression model.
        </p>
      </div>
    </footer>
  );
}
