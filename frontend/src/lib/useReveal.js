import { useEffect, useRef, useState } from 'react';

/**
 * Adds `.in` to every [data-reveal] inside the returned ref once it scrolls into view.
 * Observe the parent, not a clipped child (a fully clipped child never intersects).
 */
export function useReveal() {
  const ref = useRef(null);
  useEffect(() => {
    const root = ref.current;
    if (!root) return;
    const els = root.matches('[data-reveal]') ? [root] : [...root.querySelectorAll('[data-reveal]')];
    if (!('IntersectionObserver' in window)) {
      els.forEach((el) => el.classList.add('in'));
      return;
    }
    const io = new IntersectionObserver(
      (entries) => {
        entries.forEach((e) => {
          if (e.isIntersecting) {
            e.target.classList.add('in');
            io.unobserve(e.target);
          }
        });
      },
      { threshold: 0.18, rootMargin: '0px 0px -6% 0px' }
    );
    els.forEach((el) => io.observe(el));
    return () => io.disconnect();
  }, []);
  return ref;
}

/** True once the element has been seen (for one-shot animations like the markup pass). */
export function useInView(options = { threshold: 0.3 }) {
  const ref = useRef(null);
  const [seen, setSeen] = useState(false);
  useEffect(() => {
    const el = ref.current;
    if (!el || seen) return;
    if (!('IntersectionObserver' in window)) {
      setSeen(true);
      return;
    }
    const io = new IntersectionObserver(([e]) => {
      if (e.isIntersecting) {
        setSeen(true);
        io.disconnect();
      }
    }, options);
    io.observe(el);
    return () => io.disconnect();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [seen]);
  return [ref, seen];
}
