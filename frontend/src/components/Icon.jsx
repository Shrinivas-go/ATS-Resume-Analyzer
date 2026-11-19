/** Stroke icons: inherit currentColor, mitred corners, butt caps. */
const paths = {
  arrow: <path d="M4 12h15M13 6l6 6-6 6" />,
  arrowDown: <path d="M12 4v15M6 13l6 6 6-6" />,
  download: <path d="M12 4v11M7 10l5 5 5-5M5 20h14" />,
  close: <path d="M6 6l12 12M18 6 6 18" />,
  plus: <path d="M12 5v14M5 12h14" />,
  file: <path d="M6 3h8l5 5v13H6zM14 3v5h5" />,
  check: <path d="M5 12.5l4.5 4.5L19 7.5" />,
  chevron: <path d="M7 10l5 5 5-5" />,
};

export default function Icon({ name, className = '', title }) {
  return (
    <svg
      className={`ico ${className}`}
      viewBox="0 0 24 24"
      aria-hidden={title ? undefined : true}
      role={title ? 'img' : undefined}
    >
      {title && <title>{title}</title>}
      {paths[name]}
    </svg>
  );
}
