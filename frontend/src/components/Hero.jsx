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
      <div className="container" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
        <div className="notion-tag" style={{ marginBottom: '1.5rem', backgroundColor: 'var(--periwinkle)', color: 'var(--text-main)', border: '2px solid var(--text-main)', fontWeight: '700', fontSize: '0.8rem', textTransform: 'uppercase' }}>
          Logistic Regression Model
        </div>
        
        <h1 className="hero-title">
          Resume Parser & <br />
          <span style={{ borderBottom: '3px solid var(--periwinkle-3)', paddingBottom: '2px' }}>Skill Matcher</span>
        </h1>
        
        <p className="hero-subtitle">
          This is a simple tool to check how well your resume matches a job description. We train a Logistic Regression model on a resume dataset to predict your job category, and check the text to find missing skills.
        </p>

        <button onClick={handleAction} className="notion-btn notion-btn-primary" style={{ padding: '0.8rem 2rem', fontSize: '1.05rem', fontWeight: '600' }}>
          {user ? 'Go to Dashboard' : 'Check Your Resume'}
        </button>
      </div>
    </section>
  );
}
