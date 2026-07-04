import React, { useState, useEffect, useRef } from 'react';
import axios from 'axios';
import { API_URL } from '../config/api';

export default function Dashboard() {
  const [file, setFile] = useState(null);
  const [jobDescription, setJobDescription] = useState('');
  const [jobTitle, setJobTitle] = useState('');
  
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [successResult, setSuccessResult] = useState(null);
  
  const [history, setHistory] = useState([]);
  const [historyLoading, setHistoryLoading] = useState(false);
  const [activeHistoryId, setActiveHistoryId] = useState(null);

  const fileInputRef = useRef(null);

  // Fetch scan history on component mount
  useEffect(() => {
    fetchHistory();
  }, []);

  const fetchHistory = async () => {
    setHistoryLoading(true);
    try {
      const res = await axios.get(`${API_URL}/api/history`, { withCredentials: true });
      if (res.data.success) {
        setHistory(res.data.scans || []);
      }
    } catch (err) {
      console.error('Error fetching scan history:', err);
    } finally {
      setHistoryLoading(false);
    }
  };

  const handleDragOver = (e) => {
    e.preventDefault();
  };

  const handleDrop = (e) => {
    e.preventDefault();
    const droppedFiles = e.dataTransfer.files;
    if (droppedFiles && droppedFiles.length > 0) {
      const f = droppedFiles[0];
      if (f.type === 'application/pdf' || f.name.endsWith('.pdf')) {
        setFile(f);
        setError('');
      } else {
        setError('Only PDF resumes are supported.');
      }
    }
  };

  const handleFileChange = (e) => {
    const selectedFiles = e.target.files;
    if (selectedFiles && selectedFiles.length > 0) {
      const f = selectedFiles[0];
      if (f.name.endsWith('.pdf')) {
        setFile(f);
        setError('');
      } else {
        setError('Only PDF resumes are supported.');
      }
    }
  };

  const triggerFileInput = () => {
    if (fileInputRef.current) fileInputRef.current.click();
  };

  const handleAnalyze = async (e) => {
    e.preventDefault();
    if (!file) {
      setError('Please select or drag a PDF resume first.');
      return;
    }
    if (!jobDescription.trim()) {
      setError('Please enter a target job description for comparison.');
      return;
    }

    setLoading(true);
    setError('');
    setSuccessResult(null);

    const formData = new FormData();
    formData.append('resume', file);
    formData.append('jobDescription', jobDescription);
    formData.append('jobTitle', jobTitle || 'General Scan');

    try {
      const res = await axios.post(`${API_URL}/api/analyze`, formData, {
        withCredentials: true,
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      });

      if (res.data.success) {
        setSuccessResult(res.data);
        // Refresh scan history to show the new scan
        fetchHistory();
      } else {
        setError(res.data.message || 'Analysis failed.');
      }
    } catch (err) {
      console.error(err);
      setError(err.response?.data?.message || 'Error occurred while contacting backend server.');
    } finally {
      setLoading(false);
    }
  };

  // Load a historical scan result into view
  const handleLoadHistoryItem = (scan) => {
    setActiveHistoryId(scan._id);
    setSuccessResult({
      score: scan.score,
      explanation: `Historical scan from ${new Date(scan.createdAt).toLocaleDateString()}`,
      predictedCategory: scan.predictedCategory,
      contactInfo: scan.contactInfo,
      skillsAnalyzed: {
        resumeSkillsCount: scan.matchedSkills?.length || 0,
        matchedCore: scan.matchedSkills || [],
        missingCore: scan.missingSkills || [],
        matchedOptional: [],
        missingOptional: []
      }
    });
  };

  const handleNewScan = () => {
    setFile(null);
    setJobDescription('');
    setJobTitle('');
    setSuccessResult(null);
    setError('');
    setActiveHistoryId(null);
  };

  // Class helper for score color circle
  const getScoreClass = (score) => {
    if (score >= 85) return 'high';
    if (score >= 60) return 'mid';
    return 'low';
  };

  return (
    <div className="container">
      <div className="dashboard-layout">
        
        {/* Sidebar Panel: Scan History */}
        <div className="sidebar-panel">
          <h3 style={{ fontSize: '1.05rem', fontWeight: '700', marginBottom: '1rem', borderBottom: '1px solid var(--border-color)', paddingBottom: '0.5rem' }}>
            Recent Scans
          </h3>
          
          {historyLoading ? (
            <p style={{ fontSize: '0.85rem', color: 'var(--text-light)' }}>Loading history...</p>
          ) : history.length === 0 ? (
            <p style={{ fontSize: '0.85rem', color: 'var(--text-light)' }}>No previous scans found.</p>
          ) : (
            <div className="flex flex-col gap-2">
              {history.map((scan) => (
                <div
                  key={scan._id}
                  className={`history-item ${activeHistoryId === scan._id ? 'active' : ''}`}
                  onClick={() => handleLoadHistoryItem(scan)}
                >
                  <p style={{ fontSize: '0.85rem', fontWeight: '600', color: 'var(--text-main)' }}>
                    {scan.jobTitle || 'General Scan'}
                  </p>
                  <div className="flex justify-between" style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '0.2rem' }}>
                    <span>Score: {scan.score}%</span>
                    <span>{new Date(scan.createdAt).toLocaleDateString()}</span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Main Panel: Scan Form vs Results */}
        <div className="flex flex-col gap-6">
          
          {/* Header Action Row */}
          <div className="flex justify-between align-center" style={{ borderBottom: '1px solid var(--border-color)', paddingBottom: '1rem' }}>
            <div>
              <h2 style={{ fontSize: '1.5rem', fontWeight: '700' }}>Candidate Scan Room</h2>
              <p style={{ fontSize: '0.9rem', color: 'var(--text-muted)' }}>Compare resumes against job requirements</p>
            </div>
            {successResult && (
              <button onClick={handleNewScan} className="notion-btn notion-btn-primary">
                Start New Scan
              </button>
            )}
          </div>

          {error && (
            <div className="notion-tag notion-tag-danger" style={{ display: 'block', padding: '0.75rem', fontSize: '0.9rem' }}>
              {error}
            </div>
          )}

          {!successResult ? (
            /* SCAN INPUT FORM */
            <form onSubmit={handleAnalyze} className="notion-card flex flex-col gap-6">
              
              <div className="flex flex-col gap-2">
                <label style={{ fontSize: '0.9rem', fontWeight: '700' }}>Job Title (Optional)</label>
                <input
                  type="text"
                  className="notion-input"
                  placeholder="e.g. Software Engineer / Data Scientist"
                  value={jobTitle}
                  onChange={(e) => setJobTitle(e.target.value)}
                />
              </div>

              <div className="flex flex-col gap-2">
                <label style={{ fontSize: '0.9rem', fontWeight: '700' }}>1. Upload Resume (PDF only)</label>
                <input
                  type="file"
                  ref={fileInputRef}
                  onChange={handleFileChange}
                  accept=".pdf"
                  style={{ display: 'none' }}
                />
                
                <div
                  className={`dropzone text-center ${file ? 'active' : ''}`}
                  onDragOver={handleDragOver}
                  onDrop={handleDrop}
                  onClick={triggerFileInput}
                >
                  {file ? (
                    <p style={{ fontWeight: '600', color: 'var(--text-main)' }}>
                      Selected File: {file.name} ({(file.size / 1024).toFixed(1)} KB)
                    </p>
                  ) : (
                    <p style={{ color: 'var(--text-muted)' }}>
                      Select a PDF resume file to upload and scan
                    </p>
                  )}
                  <span style={{ fontSize: '0.75rem', color: 'var(--text-light)', display: 'block', marginTop: '0.5rem' }}>
                    Only standard PDF files are supported
                  </span>
                </div>
              </div>

              <div className="flex flex-col gap-2">
                <label style={{ fontSize: '0.9rem', fontWeight: '700' }}>2. Target Job Description</label>
                <textarea
                  className="notion-input"
                  style={{ minHeight: '180px', resize: 'vertical', fontFamily: 'inherit' }}
                  placeholder="Paste the target job description text here. Mention required skills, must-have tools, and preferred background to match keywords correctly..."
                  value={jobDescription}
                  onChange={(e) => setJobDescription(e.target.value)}
                />
              </div>

              <button
                type="submit"
                disabled={loading}
                className="notion-btn notion-btn-primary"
                style={{ padding: '0.9rem', fontSize: '1.05rem', fontWeight: '600', marginTop: '0.5rem' }}
              >
                {loading ? 'Running match analyzer...' : 'Scan Resume'}
              </button>
            </form>
          ) : (
            /* ANALYSIS RESULTS */
            <div className="flex flex-col gap-6">
              
              {/* Match Score & Prediction Banner */}
              <div className="notion-card">
                <div className="score-container">
                  <div className={`score-badge ${getScoreClass(successResult.score)}`}>
                    {successResult.score}%
                  </div>
                  <div>
                    <h3 style={{ fontSize: '1.25rem', fontWeight: '700', marginBottom: '0.25rem' }}>
                      ATS Compatibility Match
                    </h3>
                    <p style={{ fontSize: '0.9rem', color: 'var(--text-muted)' }}>
                      {successResult.explanation}
                    </p>
                  </div>
                </div>

                <div style={{ display: 'flex', gap: '1.5rem', borderTop: '1px solid var(--border-color)', paddingTop: '1rem', marginTop: '1rem' }}>
                  <div>
                    <span style={{ fontSize: '0.8rem', color: 'var(--text-light)', display: 'block', textTransform: 'uppercase' }}>
                      Predicted Job Profile
                    </span>
                    <strong style={{ fontSize: '1rem', color: 'var(--text-main)' }}>
                      {successResult.predictedCategory}
                    </strong>
                  </div>
                  {successResult.predictionConfidence > 0 && (
                    <div>
                      <span style={{ fontSize: '0.8rem', color: 'var(--text-light)', display: 'block', textTransform: 'uppercase' }}>
                        Prediction Confidence
                      </span>
                      <strong style={{ fontSize: '1rem', color: 'var(--text-main)' }}>
                        {(successResult.predictionConfidence * 100).toFixed(0)}%
                      </strong>
                    </div>
                  )}
                </div>
              </div>

              {/* Skill Comparison Results */}
              <div className="notion-card">
                <h3 style={{ fontSize: '1.1rem', fontWeight: '700', marginBottom: '1.25rem', borderBottom: '1px solid var(--border-color)', paddingBottom: '0.5rem' }}>
                  Skill Gap Analyzer
                </h3>

                <div className="flex flex-col gap-5">
                  <div>
                    <h4 style={{ fontSize: '0.9rem', fontWeight: '700', color: 'var(--color-success)', marginBottom: '0.5rem' }}>
                      Matched Core Skills ({successResult.skillsAnalyzed?.matchedCore?.length || 0})
                    </h4>
                    {successResult.skillsAnalyzed?.matchedCore?.length > 0 ? (
                      <div className="flex flex-wrap gap-2">
                        {successResult.skillsAnalyzed.matchedCore.map((skill, index) => (
                          <span key={index} className="notion-tag notion-tag-success">{skill}</span>
                        ))}
                      </div>
                    ) : (
                      <p style={{ fontSize: '0.85rem', color: 'var(--text-light)', fontStyle: 'italic' }}>No core skills matched.</p>
                    )}
                  </div>

                  <div>
                    <h4 style={{ fontSize: '0.9rem', fontWeight: '700', color: 'var(--color-danger)', marginBottom: '0.5rem' }}>
                      Missing Core Skills ({successResult.skillsAnalyzed?.missingCore?.length || 0})
                    </h4>
                    {successResult.skillsAnalyzed?.missingCore?.length > 0 ? (
                      <div className="flex flex-wrap gap-2">
                        {successResult.skillsAnalyzed.missingCore.map((skill, index) => (
                          <span key={index} className="notion-tag notion-tag-danger">{skill}</span>
                        ))}
                      </div>
                    ) : (
                      <p style={{ fontSize: '0.85rem', color: 'var(--text-light)', fontStyle: 'italic' }}>No missing core skills! You have covered all requirements.</p>
                    )}
                  </div>
                </div>
              </div>

              {/* Contact Information & Metadata */}
              <div className="notion-card">
                <h3 style={{ fontSize: '1.1rem', fontWeight: '700', marginBottom: '1rem', borderBottom: '1px solid var(--border-color)', paddingBottom: '0.5rem' }}>
                  Contact Details
                </h3>
                <div className="grid" style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))', gap: '1rem' }}>
                  <div>
                    <span style={{ fontSize: '0.8rem', color: 'var(--text-light)', display: 'block' }}>Email</span>
                    <strong>{successResult.contactInfo?.email || 'Not detected'}</strong>
                  </div>
                  <div>
                    <span style={{ fontSize: '0.8rem', color: 'var(--text-light)', display: 'block' }}>Phone</span>
                    <strong>{successResult.contactInfo?.phone || 'Not detected'}</strong>
                  </div>
                  {successResult.contactInfo?.linkedin && (
                    <div>
                      <span style={{ fontSize: '0.8rem', color: 'var(--text-light)', display: 'block' }}>LinkedIn</span>
                      <a href={successResult.contactInfo.linkedin} target="_blank" rel="noreferrer" style={{ color: 'var(--periwinkle-3)', textDecoration: 'underline' }}>
                        Profile Link
                      </a>
                    </div>
                  )}
                  {successResult.contactInfo?.github && (
                    <div>
                      <span style={{ fontSize: '0.8rem', color: 'var(--text-light)', display: 'block' }}>GitHub</span>
                      <a href={successResult.contactInfo.github} target="_blank" rel="noreferrer" style={{ color: 'var(--periwinkle-3)', textDecoration: 'underline' }}>
                        Repository Link
                      </a>
                    </div>
                  )}
                </div>
              </div>

            </div>
          )}

        </div>
      </div>
    </div>
  );
}
