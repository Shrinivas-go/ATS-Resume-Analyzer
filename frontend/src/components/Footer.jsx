import React from 'react';

export default function Footer() {
  return (
    <footer className="footer">
      <div className="container">
        <p style={{ marginBottom: '0.5rem' }}>📄 ATS Resume Checker — Built for Professional Careers</p>
        <p style={{ fontSize: '0.8rem', color: 'var(--text-light)' }}>
          © {new Date().getFullYear()} ATS Checker. No tracking cookies. Solid white surfaces and flat borders.
        </p>
      </div>
    </footer>
  );
}
