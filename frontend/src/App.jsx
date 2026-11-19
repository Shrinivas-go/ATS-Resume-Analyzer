import { lazy, Suspense, useState } from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { MotionConfig } from 'framer-motion';
import { Toaster } from 'sonner';
import { AuthProvider, useAuth } from './context/AuthContext';
import Navbar from './components/Navbar';
import Footer from './components/Footer';
import AuthModal from './components/AuthModal';
import Landing from './pages/Landing';

// The scan desk (and jsPDF inside it) loads only when someone opens it
const Dashboard = lazy(() => import('./pages/Dashboard'));

// Dev-only preview of the results view with sample data (stripped from production builds)
const DevPreview = import.meta.env.DEV ? lazy(() => import('./dev/DevPreview')) : null;

function ProtectedRoute({ children }) {
  const { user, loading } = useAuth();
  if (loading) {
    return (
      <div className="page-loading">
        <p className="label">Checking your session…</p>
      </div>
    );
  }
  if (!user) return <Navigate to="/" replace />;
  return children;
}

function AppContent() {
  const [authOpen, setAuthOpen] = useState(false);
  const [authMode, setAuthMode] = useState('login');

  const openAuth = (mode = 'login') => {
    setAuthMode(mode);
    setAuthOpen(true);
  };

  return (
    <div className="app">
      <Navbar onOpenAuth={openAuth} />
      <main>
        <Routes>
          <Route path="/" element={<Landing onOpenAuth={openAuth} />} />
          <Route
            path="/dashboard"
            element={
              <ProtectedRoute>
                <Suspense fallback={<div className="page-loading"><p className="label">Opening the desk…</p></div>}>
                  <Dashboard />
                </Suspense>
              </ProtectedRoute>
            }
          />
          {DevPreview && (
            <Route
              path="/dev/:view"
              element={
                <Suspense fallback={null}>
                  <DevPreview />
                </Suspense>
              }
            />
          )}
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </main>
      <Footer />
      <AuthModal isOpen={authOpen} mode={authMode} onClose={() => setAuthOpen(false)} onSwitchMode={setAuthMode} />
      <Toaster
        position="bottom-right"
        toastOptions={{
          unstyled: true,
          classNames: {
            toast: 'toast',
            title: 'toast__title',
            description: 'toast__desc',
            success: 'toast--ok',
            error: 'toast--err',
          },
        }}
      />
    </div>
  );
}

export default function App() {
  return (
    <MotionConfig reducedMotion="user">
      <AuthProvider>
        <AppContent />
      </AuthProvider>
    </MotionConfig>
  );
}
