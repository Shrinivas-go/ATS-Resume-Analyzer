/**
 * Split a block of text into plain and marked segments.
 *
 * Every occurrence of a `hits` term becomes { kind: 'hit' } and every occurrence of a
 * `misses` term becomes { kind: 'miss' }. Matching is case-insensitive and respects
 * word edges, so "Go" does not mark "Google" and "C++" / "CI/CD" / "Node.js" still match.
 */
const escapeRe = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

export function markupSegments(text, hits = [], misses = []) {
  if (!text) return [];

  const terms = [
    ...hits.map((t) => ({ t: String(t).trim(), kind: 'hit' })),
    ...misses.map((t) => ({ t: String(t).trim(), kind: 'miss' })),
  ].filter((x) => x.t.length > 1);

  if (terms.length === 0) return [{ text }];

  // Longest first so "machine learning" wins over "learning"
  terms.sort((a, b) => b.t.length - a.t.length);
  const kindOf = new Map(terms.map((x) => [x.t.toLowerCase(), x.kind]));
  const re = new RegExp(
    `(?<![A-Za-z0-9])(${terms.map((x) => escapeRe(x.t)).join('|')})(?![A-Za-z0-9+#])`,
    'gi'
  );

  const out = [];
  let last = 0;
  let m;
  while ((m = re.exec(text)) !== null) {
    if (m.index > last) out.push({ text: text.slice(last, m.index) });
    out.push({ text: m[0], kind: kindOf.get(m[0].toLowerCase()) || 'hit' });
    last = m.index + m[0].length;
  }
  if (last < text.length) out.push({ text: text.slice(last) });
  return out;
}
