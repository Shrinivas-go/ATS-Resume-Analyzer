import React from 'react';
import { useAuth } from '../context/AuthContext';
import { Link, useNavigate, useLocation } from 'react-router-dom';

function LogoIcon({ size = 24 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 512 512" fill="none" xmlns="http://www.w3.org/2000/svg">
      <rect x="16" y="16" width="480" height="480" rx="96" ry="96" fill="#b6ccfe"/>
      <path d="M160 96h128l80 80v240c0 17.7-14.3 32-32 32H160c-17.7 0-32-14.3-32-32V128c0-17.7 14.3-32 32-32z" fill="white" opacity="0.95"/>
      <path d="M288 96v48c0 17.7 14.3 32 32 32h48z" fill="#ccdbfd"/>
      <circle cx="340" cy="360" r="72" fill="#b6ccfe" stroke="white" strokeWidth="6"/>
      <polyline points="308,360 330,384 372,336" fill="none" stroke="white" strokeWidth="14" strokeLinecap="round" strokeLinejoin="round"/>
      <rect x="168" y="200" width="140" height="12" rx="6" fill="#ccdbfd"/>
      <rect x="168" y="232" width="110" height="12" rx="6" fill="#ccdbfd"/>
      <rect x="168" y="264" width="80" height="12" rx="6" fill="#ccdbfd"/>
    </svg>
  );
}

export { LogoIcon };

export default function Navbar({ onOpenAuth }) {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const handleLogout = async () => {
    await logout();
    navigate('/');
  };

  const scrollToSection = (id) => {
    if (location.pathname !== '/') {
      navigate('/', { state: { scrollTo: id } });
      return;
    }
    const element = document.getElementById(id);
    if (element) {
      element.scrollIntoView({ behavior: 'smooth' });
    }
  };

  return (
    <header className="navbar">
      <div className="container navbar-container">
        <Link to="/" className="logo">
          <LogoIcon size={28} />
          ATS Checker
        </Link>

        <nav className="nav-links">
          <span onClick={() => scrollToSection('features')} className="nav-link">Features</span>
          <span onClick={() => scrollToSection('how-to-use')} className="nav-link">How to Use</span>
          
          {user ? (
            <>
              <Link to="/dashboard" className="nav-link" style={{ fontWeight: '600' }}>Dashboard</Link>
              <span style={{ fontSize: '0.9rem', color: 'var(--text-light)' }}>|</span>
              <span className="notion-tag notion-tag-core" style={{ fontWeight: '700', padding: '0.35rem 0.7rem', border: '2px solid var(--text-main)', fontSize: '0.8rem', textTransform: 'uppercase' }}>
                User: {user.name}
              </span>
              <button onClick={handleLogout} className="notion-btn notion-btn-danger" style={{ padding: '0.4rem 0.8rem', fontSize: '0.85rem' }}>
                Log Out
              </button>
            </>
          ) : (
            <>
              <button onClick={() => onOpenAuth('login')} className="notion-btn" style={{ padding: '0.4rem 1rem', fontSize: '0.9rem', border: 'none', boxShadow: 'none', background: 'none' }}>
                Log In
              </button>
              <button onClick={() => onOpenAuth('register')} className="notion-btn notion-btn-primary" style={{ padding: '0.4rem 1rem', fontSize: '0.9rem' }}>
                Sign Up
              </button>
            </>
          )}
        </nav>
      </div>
    </header>
  );
}
