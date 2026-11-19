import { Link, useLocation, useNavigate } from 'react-router-dom';
import * as Dropdown from '@radix-ui/react-dropdown-menu';
import { toast } from 'sonner';
import { useAuth } from '../context/AuthContext';
import Logo from './Logo';
import Icon from './Icon';
import './Navbar.css';

export default function Navbar({ onOpenAuth }) {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const goTo = (id) => {
    if (location.pathname !== '/') {
      navigate('/', { state: { scrollTo: id } });
      return;
    }
    document.getElementById(id)?.scrollIntoView({ behavior: 'smooth' });
  };

  const handleLogout = async () => {
    await logout();
    toast('Logged out', { description: 'Your saved scans stay on your account.' });
    navigate('/');
  };

  const initials = (user?.name || user?.email || '?')
    .split(/\s+/)
    .map((p) => p[0])
    .join('')
    .slice(0, 2)
    .toUpperCase();

  return (
    <header className="nav">
      <div className="wrap nav__in">
        <Logo />

        <nav className="nav__links" aria-label="Sections">
          <button type="button" onClick={() => goTo('checks')}>The checks</button>
          <button type="button" onClick={() => goTo('passes')}>How it works</button>
        </nav>

        <div className="nav__actions">
          {user ? (
            <>
              {location.pathname !== '/dashboard' && (
                <Link to="/dashboard" className="btn btn--ink nav__cta">
                  Scan desk <Icon name="arrow" />
                </Link>
              )}
              <Dropdown.Root modal={false}>
                <Dropdown.Trigger className="nav__me" aria-label={`Account: ${user.name || user.email}`}>
                  <span className="nav__initials">{initials}</span>
                  <Icon name="chevron" />
                </Dropdown.Trigger>
                <Dropdown.Portal>
                  <Dropdown.Content className="menu" align="end" sideOffset={10}>
                    <div className="menu__head">
                      <p className="menu__name">{user.name}</p>
                      <p className="label">{user.email}</p>
                    </div>
                    <Dropdown.Item className="menu__item" onSelect={() => navigate('/dashboard')}>
                      Scan desk
                    </Dropdown.Item>
                    <Dropdown.Separator className="menu__sep" />
                    <Dropdown.Item className="menu__item menu__item--out" onSelect={handleLogout}>
                      Log out
                    </Dropdown.Item>
                  </Dropdown.Content>
                </Dropdown.Portal>
              </Dropdown.Root>
            </>
          ) : (
            <>
              <button type="button" className="nav__login" onClick={() => onOpenAuth('login')}>
                Log in
              </button>
              <button type="button" className="btn btn--ink nav__cta" onClick={() => onOpenAuth('register')}>
                Scan a resume <Icon name="arrow" />
              </button>
            </>
          )}
        </div>
      </div>
    </header>
  );
}
