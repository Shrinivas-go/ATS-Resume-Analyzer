import { useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import Hero from '../sections/Hero';
import Rubric from '../sections/Rubric';
import Passes from '../sections/Passes';
import Fields from '../sections/Fields';
import Finale from '../sections/Finale';

export default function Landing({ onOpenAuth }) {
  const { user } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  // Arriving from another page via a nav link ("The checks", "How it works")
  useEffect(() => {
    const id = location.state?.scrollTo;
    if (!id) return;
    const t = setTimeout(() => {
      document.getElementById(id)?.scrollIntoView({ behavior: 'smooth' });
      navigate('.', { replace: true, state: null });
    }, 60);
    return () => clearTimeout(t);
  }, [location.state, navigate]);

  const onAction = () => (user ? navigate('/dashboard') : onOpenAuth('register'));
  const actionLabel = user ? 'Open the scan desk' : 'Scan your resume';

  return (
    <>
      <Hero onAction={onAction} actionLabel={actionLabel} />
      <Rubric />
      <Passes />
      <Fields />
      <Finale onAction={onAction} actionLabel={actionLabel} />
    </>
  );
}
