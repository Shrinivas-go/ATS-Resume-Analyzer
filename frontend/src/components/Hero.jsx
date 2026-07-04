import React from 'react';
import { useAuth } from '../context/AuthContext';
import { useNavigate } from 'react-router-dom';

export default function Hero({ onOpenAuth }) {
  const { user } = useAuth();
  const navigate = useNavigate();

  const handleAction = () => {
    if (user) {
      navigate('/dashboard');
    } else {
      onOpenAuth('login');
    }
  };

  return (
    <section className="hero-section text-center">
      {/* Left decorative panel */}
      <div className="hero-deco hero-deco-left" aria-hidden="true">
        <div className="deco-card">
          <div className="deco-line" style={{ width: '70%' }}></div>
          <div className="deco-line" style={{ width: '90%' }}></div>
          <div className="deco-line" style={{ width: '50%' }}></div>
          <div className="deco-dot-row">
            <span className="deco-dot deco-dot-green"></span>
            <span className="deco-dot deco-dot-blue"></span>
            <span className="deco-dot deco-dot-muted"></span>
          </div>
          <div className="deco-line" style={{ width: '80%' }}></div>
          <div className="deco-line" style={{ width: '60%' }}></div>
        </div>
      </div>

      {/* Right decorative panel */}
      <div className="hero-deco hero-deco-right" aria-hidden="true">
        <div className="deco-card">
          <div className="deco-score-ring">
            <svg viewBox="0 0 60 60" width="60" height="60">
              <circle cx="30" cy="30" r="24" fill="none" stroke="#e2eafc" strokeWidth="5" />
              <circle cx="30" cy="30" r="24" fill="none" stroke="#b6ccfe" strokeWidth="5"
                strokeDasharray="110 151" strokeLinecap="round"
                transform="rotate(-90 30 30)" />
            </svg>
            <span className="deco-score-label">72%</span>
          </div>
          <div className="deco-line" style={{ width: '100%', background: '#d1fae5' }}></div>
          <div className="deco-line" style={{ width: '100%', background: '#fee2e2' }}></div>
          <div className="deco-line" style={{ width: '70%' }}></div>
        </div>
      </div>

      <div className="container" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', position: 'relative', zIndex: 2 }}>
        <div className="notion-tag" style={{ marginBottom: '1.5rem', backgroundColor: 'var(--periwinkle)', color: 'var(--text-main)', border: '2px solid var(--text-main)', fontWeight: '700', fontSize: '0.8rem', textTransform: 'uppercase' }}>
          Logistic Regression Model
        </div>
        
        <h1 className="hero-title">
          Resume Parser &<br />
          <span style={{ borderBottom: '3px solid var(--periwinkle-3)', paddingBottom: '2px' }}>Skill</span>{' '}
          <span style={{ borderBottom: '3px solid var(--baby-blue-ice)', paddingBottom: '2px' }}>Matcher</span>
        </h1>
        
        <p className="hero-subtitle" style={{ marginBottom: '0.75rem' }}>
          Upload your resume and paste a <span style={{ color: 'var(--text-main)', fontWeight: '600' }}>job description</span> — we'll show you which <span style={{ color: '#10b981', fontWeight: '600' }}>keywords match</span> and which ones are <span style={{ color: '#ef4444', fontWeight: '600' }}>missing</span>.
        </p>
        <p className="hero-subtitle" style={{ marginTop: 0 }}>
          Our <span style={{ color: 'var(--text-main)', fontWeight: '600' }}>ML classifier</span> also predicts your resume's <span style={{ color: '#b6ccfe', fontWeight: '600', borderBottom: '2px solid #b6ccfe' }}>job category</span> from 24 fields like IT, Finance, or Sales.
        </p>

        <button onClick={handleAction} className="notion-btn notion-btn-primary" style={{ padding: '0.8rem 2rem', fontSize: '1.05rem', fontWeight: '600', marginTop: '0.5rem' }}>
          {user ? 'Go to Dashboard' : 'Check Your Resume'}
        </button>
      </div>
    </section>
  );
}
