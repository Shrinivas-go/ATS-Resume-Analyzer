import Logo from './Logo';
import './Footer.css';

export default function Footer() {
  return (
    <footer className="foot">
      <div className="wrap foot__in">
        <Logo />
        <p className="foot__note">
          A side project for matching resumes to job postings. Express, React, MongoDB,
          and two small models trained for this: ats-scorer and ats-lm.
        </p>
        <p className="label">© {new Date().getFullYear()} · Files are deleted after parsing</p>
      </div>
    </footer>
  );
}
