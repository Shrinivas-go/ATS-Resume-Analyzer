import React from 'react';
import Hero from '../components/Hero';

export default function Landing({ onOpenAuth }) {
  return (
    <div className="landing-page">
      {/* 1. Hero Section — no dotted background, has decorative panels */}
      <Hero onOpenAuth={onOpenAuth} />

      {/* 2. What it Does — Section 1: ML Category Classification */}
      <section id="features" className="feature-section no-dots">
        <div className="container">
          <div className="feature-grid">
            <div>
              <span className="section-tag">Classifier</span>
              <h2 className="section-title">Job Category Predictor</h2>
              <p style={{ color: 'var(--text-muted)', marginBottom: '1.25rem' }}>
                Our model takes your resume text and runs a Logistic Regression classifier trained on a dataset of 24,000 resumes. This helps you check how your resume is categorized by automated screening systems.
              </p>
              <ul style={{ paddingLeft: '1.25rem', color: 'var(--text-muted)', display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                <li>Checks against 24 common job categories (like IT, Finance, HR, Chef, Sales)</li>
                <li>Shows the prediction confidence percentage</li>
                <li>Validates if your resume text aligns with your target job field</li>
              </ul>
            </div>
            <div className="feature-graphic">
              <div className="feature-img-slot">
                <img
                  src="/resume_classifier_flat.png"
                  alt="ML Job Profile Classifier"
                  style={{ width: '100%', display: 'block' }}
                />
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* 3. What it Does — Section 2: Skill Gap Analysis */}
      <section className="feature-section no-dots">
        <div className="container">
          <div className="feature-grid" style={{ direction: 'rtl' }}>
            <div style={{ direction: 'ltr' }}>
              <span className="section-tag">Matcher</span>
              <h2 className="section-title">Keyword Gap Analyzer</h2>
              <p style={{ color: 'var(--text-muted)', marginBottom: '1.25rem' }}>
                Our matching engine scans the job description to find required skills and compares them to your resume text. It identifies which core skills you matched and which ones you need to add.
              </p>
              <ul style={{ paddingLeft: '1.25rem', color: 'var(--text-muted)', display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                <li>Extracts skills from the target job description automatically</li>
                <li>Highlights matched vs. missing skills using visual tags</li>
                <li>Calculates a final score based on the matching keyword count</li>
              </ul>
            </div>
            <div className="feature-graphic" style={{ direction: 'ltr' }}>
              <div className="feature-img-slot">
                <img
                  src="/skill_gap_analysis_flat.png"
                  alt="Weighted Skill Gap Analysis"
                  style={{ width: '100%', display: 'block' }}
                />
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* 4. How to Use Section — keeps dotted background */}
      <section id="how-to-use" className="feature-section has-dots">
        <div className="container">
          <span className="section-tag text-center" style={{ display: 'block' }}>Instructions</span>
          <h2 className="section-title text-center">Three Simple Steps</h2>
          
          <div className="how-to-use-grid">
            <div className="notion-card">
              <div className="step-num">01</div>
              <h3 style={{ fontSize: '1.1rem', fontWeight: '700', marginBottom: '0.5rem' }}>Upload Resume</h3>
              <p style={{ fontSize: '0.9rem', color: 'var(--text-muted)' }}>
                Upload your resume in PDF format. We will automatically extract the plain text.
              </p>
            </div>
            <div className="notion-card">
              <div className="step-num">02</div>
              <h3 style={{ fontSize: '1.1rem', fontWeight: '700', marginBottom: '0.5rem' }}>Paste Job Description</h3>
              <p style={{ fontSize: '0.9rem', color: 'var(--text-muted)' }}>
                Paste the text of the job description you are targeting to match keywords.
              </p>
            </div>
            <div className="notion-card">
              <div className="step-num">03</div>
              <h3 style={{ fontSize: '1.1rem', fontWeight: '700', marginBottom: '0.5rem' }}>See Your Results</h3>
              <p style={{ fontSize: '0.9rem', color: 'var(--text-muted)' }}>
                Look at your final match score, see missing keywords, and adjust your resume before applying.
              </p>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
