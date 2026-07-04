import React from 'react';
import { useAuth } from '../context/AuthContext';
import { Link, useNavigate, useLocation } from 'react-router-dom';

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
