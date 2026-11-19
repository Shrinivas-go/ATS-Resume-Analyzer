import { useParams } from 'react-router-dom';
import Dashboard from '../pages/Dashboard';
import Scanning from '../components/desk/Scanning';
import '../components/desk/desk.css';

/**
 * DEV ONLY (route exists only under `npm run dev`). Renders the scan desk with
 * made-up sample data so the layout can be checked without logging in:
 *   /dev/form     empty form
 *   /dev/results  a sample result
 *   /dev/scanning the loading state
 */
const sampleJD = `Frontend Engineer — Hiring Platform

We're looking for a frontend engineer to build the candidate dashboard used by recruiters.

Requirements
- 2+ years building production apps with React and TypeScript
- Solid JavaScript, HTML and CSS
- Experience consuming REST APIs
- Comfortable with Git and code review

Nice to have
- GraphQL
- Docker
- Testing with Jest or Playwright
- Node.js and Express on the backend`;

const sampleResult = {
  success: true,
  engine: 'ats-scorer',
  score: 62,
  dimensions: [
    { name: 'skills_match', label: 'Skills match', score: 15, max: 20 },
    { name: 'experience_relevance', label: 'Experience', score: 11, max: 20 },
    { name: 'education_certifications', label: 'Education & certifications', score: 16, max: 20 },
    { name: 'industry_domain_fit', label: 'Industry fit', score: 13, max: 20 },
    { name: 'seniority_role_alignment', label: 'Seniority', score: 7, max: 20 },
  ],
  savedReview: {
    review: {
      summary: 'Sample review: a solid React and REST base with deployed projects, but TypeScript is missing and one internship reads as junior for a mid-level role.',
      dimensions: [
        { name: 'skills_match', reason: 'Sample: covers React, JavaScript, REST APIs and Git; TypeScript, a hard requirement, never appears.' },
        { name: 'experience_relevance', reason: 'Sample: one frontend internship plus two projects is relevant but short of the 2+ years asked for.' },
        { name: 'education_certifications', reason: 'Sample: a B.E. in Computer Science meets the degree expectation.' },
        { name: 'industry_domain_fit', reason: 'Sample: dashboard work for recruiters is close to this hiring-platform role.' },
        { name: 'seniority_role_alignment', reason: 'Sample: intern-level titles only, below the mid-level scope of this role.' },
      ],
    },
    profile: {
      current_title: 'Frontend Intern', years_experience: 1, seniority: 'junior', primary_domain: 'Software Engineering',
      core_skills: ['React', 'JavaScript', 'Node.js', 'REST APIs'], tools: ['Git', 'Jest', 'MongoDB'],
      key_achievements: ['Built a React dashboard used by 1,200 recruiters (sample)', 'Cut page load time by 40% (sample)'],
    },
  },
  jobTitle: 'Frontend Engineer (sample)',
  fileName: 'sample-resume.pdf',
  details: {
    matchTier: 'Good Match',
    summary:
      'This resume demonstrates good match alignment with the target role. It matches key technologies from the posting, including React, JavaScript, HTML, CSS and REST APIs. However, TypeScript and GraphQL are missing.',
    keyStrengths: [
      'Built and described 3 project(s) (e.g. ATS Resume Checker, Weather Board).',
      'Demonstrates experience deploying web applications to cloud services (like Vercel, Netlify, or Render).',
      'Successfully matches 7 core technical keywords found in the job requirements.',
    ],
    criticalGaps: [
      "Integrate the missing keyword 'TypeScript' naturally into your skills or work history.",
      'Add measurable achievements (e.g., "Reduced load time by 40%", "Served 10K+ users").',
    ],
  },
  predictedCategory: 'Software Engineering',
  predictionConfidence: 0.86,
  contactInfo: { email: 'sample@example.com', phone: '+91 00000 00000', linkedin: 'linkedin.com/in/sample', github: null },
  skillsAnalyzed: {
    matchedCore: ['React', 'JavaScript', 'HTML', 'CSS', 'REST APIs', 'Git'],
    missingCore: ['TypeScript'],
    matchedOptional: ['Jest', 'Node.js', 'Express'],
    missingOptional: ['GraphQL', 'Docker', 'Playwright'],
  },
};

const sampleHistory = [
  { _id: 'a', score: 74, jobTitle: 'Frontend Engineer (sample)', createdAt: '2026-11-17', predictedCategory: 'Software Engineering', matchedSkills: ['React', 'Git'], missingSkills: ['TypeScript'] },
  { _id: 'b', score: 61, jobTitle: 'Data Analyst (sample)', createdAt: '2026-11-12', predictedCategory: 'Data Science & AI', matchedSkills: ['SQL'], missingSkills: ['Tableau', 'Python'] },
  { _id: 'c', score: 88, jobTitle: 'Full-stack Developer (sample)', createdAt: '2026-11-02', predictedCategory: 'Software Engineering', matchedSkills: ['Node.js', 'MongoDB'], missingSkills: [] },
];

export default function DevPreview() {
  const { view } = useParams();
  if (view === 'scanning') {
    return (
      <div className="wrap" style={{ paddingTop: 48, paddingBottom: 96 }}>
        <Scanning fileName="sample-resume.pdf" />
      </div>
    );
  }
  const demo =
    view === 'results'
      ? { result: sampleResult, jobDescription: sampleJD, jobTitle: sampleResult.jobTitle, history: sampleHistory }
      : { result: null, history: sampleHistory };
  return <Dashboard key={view} demo={demo} />;
}
