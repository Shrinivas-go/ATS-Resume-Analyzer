import { describe, it, expect } from 'vitest';
import { markupSegments } from '../src/lib/markup';

const marked = (text, hits, misses) =>
  markupSegments(text, hits, misses).filter((s) => s.kind).map((s) => `${s.kind}:${s.text}`);

describe('markupSegments', () => {
  it('marks found and missing skills, case-insensitively', () => {
    expect(marked('Use react and Docker daily', ['React'], ['docker'])).toEqual(['hit:react', 'miss:Docker']);
  });

  it('respects word edges', () => {
    expect(marked('Google Go', ['Go'], [])).toEqual(['hit:Go']);
  });

  it('handles symbols in skill names', () => {
    expect(marked('C++, CI/CD and Node.js', ['C++', 'Node.js'], ['CI/CD'])).toEqual(['hit:C++', 'miss:CI/CD', 'hit:Node.js']);
  });

  it('prefers the longest term', () => {
    expect(marked('machine learning', ['learning', 'machine learning'], [])).toEqual(['hit:machine learning']);
  });

  it('keeps all the original text', () => {
    const text = 'React, then TypeScript.';
    expect(markupSegments(text, ['React'], ['TypeScript']).map((s) => s.text).join('')).toBe(text);
  });
});
