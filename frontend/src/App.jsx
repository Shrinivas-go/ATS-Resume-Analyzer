import React, { useState } from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';

// Components & Pages
import Navbar from './components/Navbar';
import Footer from './components/Footer';
import AuthModal from './components/AuthModal';
import Landing from './pages/Landing';
import Dashboard from './components/Dashboard';

function AppContent() {
  const { user, loading } = useAuth();
  const [authModalOpen, setAuthModalOpen] = useState(false);
  const [authMode, setAuthMode] = useState('login'); // 'login' or 'register'

  const handleOpenAuth = (mode = 'login') => {
    setAuthMode(mode);
    setAuthModalOpen(true);
  };

  const handleCloseAuth = () => {
    setAuthModalOpen(false);
  };

  const handleSwitchAuthMode = (mode) => {
    setAuthMode(mode);
  };

  // Simple Protected Route helper component
  const ProtectedRoute = ({ children }) => {
    if (loading) {
      return (
        <div className="container" style={{ padding: '4rem', textAlign: 'center' }}>
          <h3>Loading your profile...</h3>
        </div>
      );
    }
    if (!user) {
      // If not logged in, redirect home and open the login dialog
      return <Navigate to="/" replace />;
    }
    return children;
  };

  return (
    <div className="app-wrapper">
      {/* Universal Navbar */}
      <Navbar onOpenAuth={handleOpenAuth} />

      {/* Main Page Area */}
      <main className="main-content">
        <Routes>
          <Route path="/" element={<Landing onOpenAuth={handleOpenAuth} />} />
          
          <Route path="/dashboard" element={
            <ProtectedRoute>
              <Dashboard />
            </ProtectedRoute>
          } />

          {/* Catch-all redirect to Landing */}
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </main>

      {/* Universal Footer */}
      <Footer />

      {/* Auth Modal overlay */}
      <AuthModal
        isOpen={authModalOpen}
        mode={authMode}
        onClose={handleCloseAuth}
        onSwitchMode={handleSwitchAuthMode}
      />
    </div>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <AppContent />
    </AuthProvider>
  );
}