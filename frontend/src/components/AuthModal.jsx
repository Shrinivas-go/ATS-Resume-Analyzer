import { useState } from 'react';
import * as Dialog from '@radix-ui/react-dialog';
import { GoogleLogin } from '@react-oauth/google';
import { toast } from 'sonner';
import { useAuth } from '../context/AuthContext';
import { useBackendStatus } from '../hooks/useBackendStatus';
import BackendWarmupCard from './BackendWarmupCard';
import Icon from './Icon';
import './AuthModal.css';

export default function AuthModal({ isOpen, mode, onClose, onSwitchMode }) {
  const { login, register, googleLogin } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [formError, setFormError] = useState('');
  const [loading, setLoading] = useState(false);

  // Only poll the backend while the dialog is open
  const { isReady, isChecking } = useBackendStatus({ enabled: isOpen });
  const backendDown = !isReady;
  const isLogin = mode === 'login';

  const done = (welcome) => {
    toast.success(welcome);
    onClose();
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (backendDown) return;
    setFormError('');
    if (!isLogin && !name.trim()) {
      setFormError('Add your name so we can label your saved scans.');
      return;
    }
    setLoading(true);
    try {
      const res = isLogin ? await login(email, password) : await register(name, email, password);
      if (res.success) done(isLogin ? 'Logged in' : 'Account created');
      else setFormError(res.message || (isLogin ? 'Login failed.' : 'Registration failed.'));
    } catch {
      setFormError('Something went wrong. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleSuccess = async ({ credential }) => {
    setFormError('');
    setLoading(true);
    try {
      const res = await googleLogin(credential);
      if (res.success) done(res.isNewUser ? 'Account created with Google' : 'Logged in with Google');
      else setFormError(res.message || 'Google login failed.');
    } catch {
      setFormError('Google login failed.');
    } finally {
      setLoading(false);
    }
  };

  const buttonLabel = backendDown ? 'Waking the server…' : loading ? 'One moment…' : isLogin ? 'Log in' : 'Create account';

  return (
    <Dialog.Root open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <Dialog.Portal>
        <Dialog.Overlay className="dlg__overlay" />
        <Dialog.Content className="dlg" aria-describedby="auth-desc">
          <div className="dlg__intro">
            <div className="dlg__head">
              <p className="label">{isLogin ? 'Welcome back' : 'New account'}</p>
              <Dialog.Close className="dlg__close" aria-label="Close">
                <Icon name="close" />
              </Dialog.Close>
            </div>

            <Dialog.Title className="display dlg__title">
              {isLogin ? (
                <>Log in to your <em>desk.</em></>
              ) : (
                <>Open a <em>scan desk.</em></>
              )}
            </Dialog.Title>
            <Dialog.Description id="auth-desc" className="dlg__desc">
              {isLogin
                ? 'Your past scans are saved to your account.'
                : 'An account keeps every scan, so you can compare versions of your resume.'}
            </Dialog.Description>
          </div>

          <div className="dlg__body">
            {formError && (
              <p className="dlg__error" role="alert">
                {formError}
              </p>
            )}

            <form onSubmit={handleSubmit} className="dlg__form">
              {!isLogin && (
                <label className="field">
                  <span className="label">Full name</span>
                  <input type="text" autoComplete="name" value={name} onChange={(e) => setName(e.target.value)} required />
                </label>
              )}
              <label className="field">
                <span className="label">Email</span>
                <input type="email" autoComplete="email" value={email} onChange={(e) => setEmail(e.target.value)} required />
              </label>
              <label className="field">
                <span className="label">Password</span>
                <input
                  type="password"
                  autoComplete={isLogin ? 'current-password' : 'new-password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                />
              </label>
              <button type="submit" disabled={loading || backendDown} className="btn btn--ink dlg__submit">
                {buttonLabel} {!loading && !backendDown && <Icon name="arrow" />}
              </button>
            </form>

            <div className="dlg__or label"><span>or</span></div>

            <div className="dlg__google">
              {import.meta.env.VITE_GOOGLE_CLIENT_ID ? (
                <GoogleLogin
                  onSuccess={handleGoogleSuccess}
                  onError={() => setFormError('Google login failed. Try email instead.')}
                  useOneTap={false}
                  theme="outline"
                  shape="rectangular"
                  text={isLogin ? 'signin_with' : 'signup_with'}
                />
              ) : (
                <p className="label">Google login isn’t configured here. Use email.</p>
              )}
            </div>

            <p className="dlg__switch">
              {isLogin ? 'New here?' : 'Already have an account?'}{' '}
              <button type="button" onClick={() => { setFormError(''); onSwitchMode(isLogin ? 'register' : 'login'); }}>
                {isLogin ? 'Create an account' : 'Log in'}
              </button>
            </p>
          </div>

          {isChecking && <BackendWarmupCard isReady={isReady} isChecking={isChecking} inline />}
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
