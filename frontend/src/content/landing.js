/**
 * Landing-page copy and data. Edit words here, not in the components.
 * The rubric mirrors backend/analysis.js (DIMENSIONS); the field list mirrors backend/ats_checker.js.
 */

export const hero = {
  strip: ['ATS resume checker', 'PDF in, markup out'],
  lead:
    'Upload your resume as a PDF and paste the job posting. You get the parser’s markup: the skills it found, the ones it couldn’t, a score across five dimensions, and a written review of each.',
  facts: [
    { k: 'Input', v: 'Text-based PDF, up to 5 MB' },
    { k: 'Your file', v: 'Deleted right after parsing' },
    { k: 'Price', v: 'Free' },
  ],
};

/** A made-up posting used only for the hero demo. */
export const samplePosting = {
  title: 'Frontend Engineer',
  meta: 'Sample posting — illustration, not a real scan',
  text:
    'We are hiring a Frontend Engineer to build our hiring dashboard. You will ship features in React and TypeScript, write tests with Jest, and work closely with design. Required: React, TypeScript, REST APIs, Git. Nice to have: GraphQL, Docker, accessibility experience, and some Node.js.',
  hits: ['React', 'REST APIs', 'Git', 'Jest', 'Node.js'],
  misses: ['TypeScript', 'GraphQL', 'Docker'],
  score: 74,
};

/**
 * The five dimensions ats-scorer predicts (0-20 each, total 0-100) and ats-lm explains.
 * Trained on resume/job evaluations from build-small-hackathon/job-search-distill (Apache-2.0).
 * See ml/README.md for how they were trained and how accurate they are.
 */
/** Every dimension is worth the same; say it once (in the copy), don't repeat it per row. */
export const pointsEach = 20;

/** mae: ats-scorer's average miss on that dimension, 0–20 scale, 987 test pairs (ml/README.md). */
export const rubric = [
  { short: 'Skills', name: 'Skills match', mae: 2.6, what: 'Hard and technical skills the posting asks for, and whether your resume shows them.' },
  { short: 'Experience', name: 'Experience', mae: 2.8, what: 'How relevant your past roles and years are to this job, not just how long you have worked.' },
  { short: 'Education', name: 'Education & certifications', mae: 3.7, what: 'Degrees, fields of study and certifications against what the posting requires.' },
  { short: 'Industry', name: 'Industry fit', mae: 3.0, what: 'Whether your background is in the same domain as the company and role.' },
  { short: 'Seniority', name: 'Seniority', mae: 3.3, what: 'Whether your titles and responsibilities match the level of the role.' },
];

/** Shown under the rubric. Fill from ml/models/ats-scorer/metrics.json after training. */
export const modelFacts = {
  trainedOn: '7,888 resume–job evaluations',
  testedOn: '987 held-out pairs',
  mae: 10.9,
  baselineMae: 15.1,
};

export const passes = [
  {
    n: '01',
    title: 'Drop the PDF',
    body: 'The text is pulled out with pdf-parse. A scanned image has no text to read, so export from Word or Google Docs instead.',
    note: 'no scans!',
  },
  {
    n: '02',
    title: 'Paste the posting',
    body: 'ats-scorer reads the posting and your resume together and scores five dimensions. Skills are split into required and preferred.',
    note: 'the whole thing',
  },
  {
    n: '03',
    title: 'Read the marks',
    body: 'ats-lm writes a reason for every score and parses your resume the way a tracking system would. Keep it all as a PDF report.',
    note: 'then rewrite',
  },
];

/** predictCategoryAndConfidence() in backend/ats_checker.js */
export const fields = [
  'Software Engineering',
  'Data Science & AI',
  'DevOps & Cloud',
  'Human Resources',
  'Finance & Accounting',
  'Education & Teaching',
  'Sales & Business Development',
  'Healthcare & Medical',
  'Legal & Law',
  'Engineering & Construction',
  'Culinary & Food Services',
];
