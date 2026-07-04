const pdfParse = require('pdf-parse');

// ── Curated skill list for ATS matching ──────────────────────────────────────
const SKILL_LIST = [
  'JavaScript', 'Python', 'Java', 'C++', 'C#', 'TypeScript', 'PHP', 'Ruby', 
  'Go', 'Rust', 'Swift', 'Kotlin', 'React', 'Angular', 'Vue', 'Svelte', 'Next.js', 
  'HTML', 'CSS', 'SASS', 'SCSS', 'Tailwind CSS', 'Bootstrap', 'Webpack', 'Vite', 'Redux', 
  'Node.js', 'Express', 'Django', 'Flask', 'FastAPI', 'Spring Boot', 'Laravel', 'Rails', 'NestJS',
  'MongoDB', 'MySQL', 'PostgreSQL', 'SQL', 'NoSQL', 'SQLite', 'Redis', 'DynamoDB', 'Firebase',
  'AWS', 'Azure', 'Google Cloud', 'GCP', 'Docker', 'Kubernetes', 'Jenkins', 'CI/CD', 'Terraform',
  'Git', 'GitHub', 'Jest', 'Mocha', 'Cypress', 'Selenium', 'Playwright', 'Postman',
  'React Native', 'Flutter', 'Android', 'iOS', 'Machine Learning', 'Deep Learning', 
  'TensorFlow', 'PyTorch', 'Pandas', 'NumPy', 'Data Analysis', 'Data Science', 'AI', 'NLP',
  'GraphQL', 'REST API', 'Microservices', 'Agile', 'Scrum', 'JIRA', 'Linux', 'Bash', 'JWT'
];

const CORE_KEYWORDS = [
  'must have', 'required', 'essential', 'mandatory', 'necessary', 'critical',
  'need to have', 'must know', 'expertise in', 'proficiency in', 'experience with',
  'strong knowledge', 'required skills', 'requirements', 'qualifications'
];

const OPTIONAL_KEYWORDS = [
  'good to have', 'nice to have', 'optional', 'plus', 'bonus', 'preferred',
  'desirable', 'advantage', 'beneficial', 'would be a plus', 'nice if you have',
  'additional skills', 'preferred qualifications'
];

/** Extract plain text from PDF buffer. */
async function extractTextFromPdf(buffer) {
  if (!buffer || buffer.length === 0) {
    throw new Error('PDF file is empty');
  }
  try {
    const data = await pdfParse(buffer);
    return (data.text || '').trim();
  } catch (err) {
    throw new Error('Could not read this PDF. Export it again from Word/Google Docs as PDF, or try a different file.');
  }
}

/** Extract basic contact info using regular expressions. */
function extractContactInfo(text) {
  const emailRegex = /([a-zA-Z0-9._-]+@[a-zA-Z0-9._-]+\.[a-zA-Z0-9_-]+)/gi;
  const emailMatch = text.match(emailRegex);

  const phoneRegex = /(?:\+?\d{1,3}[-.\s]?)?\(?\d{3}\)?[-.\s]?\d{3}[-.\s]?\d{4}/g;
  const phoneMatch = text.match(phoneRegex);

  const linkedinRegex = /linkedin\.com\/in\/[a-zA-Z0-9_-]+/gi;
  const githubRegex = /github\.com\/[a-zA-Z0-9_-]+/gi;

  const linkedin = text.match(linkedinRegex);
  const github = text.match(githubRegex);

  return {
    email: emailMatch ? emailMatch[0].toLowerCase() : null,
    phone: phoneMatch ? phoneMatch[0] : null,
    linkedin: linkedin ? `https://www.${linkedin[0]}` : null,
    github: github ? `https://www.${github[0]}` : null,
  };
}

/** Match text against our list of predefined skills. */
function extractSkills(text) {
  if (!text) return [];
  const foundSkills = new Set();
  const lowerText = text.toLowerCase();
  
  SKILL_LIST.forEach(skill => {
    // Avoid short skills producing false positives (e.g., 'Go' in other words)
    const pattern = skill.toLowerCase();
    const regex = new RegExp(`\\b${pattern.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\b`, 'i');
    if (regex.test(lowerText)) {
      foundSkills.add(skill);
    }
  });

  return Array.from(foundSkills);
}

/** Extract skills from a job description and split into Core vs Optional. */
function extractWeightedJDSkills(text) {
  if (!text) {
    return { coreSkills: [], optionalSkills: [] };
  }

  const lines = text.split(/\n|\./).map(line => line.trim()).filter(Boolean);
  const coreSet = new Set();
  const optionalSet = new Set();
  const allSet = new Set();

  lines.forEach(line => {
    const lowerLine = line.toLowerCase();
    const isCore = CORE_KEYWORDS.some(kw => lowerLine.includes(kw));
    const isOptional = OPTIONAL_KEYWORDS.some(kw => lowerLine.includes(kw));

    SKILL_LIST.forEach(skill => {
      const pattern = skill.toLowerCase();
      const regex = new RegExp(`\\b${pattern.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\b`, 'i');
      if (regex.test(line)) {
        allSet.add(skill);
        if (isCore) {
          coreSet.add(skill);
        } else if (isOptional) {
          optionalSet.add(skill);
        }
      }
    });
  });

  let coreSkills = Array.from(coreSet);
  let optionalSkills = Array.from(optionalSet);

  // If no core or optional keywords are found, default all matching skills to core
  if (coreSkills.length === 0 && optionalSkills.length === 0 && allSet.size > 0) {
    coreSkills = Array.from(allSet);
  }

  // Ensure core skills take precedence and don't overlap with optional
  optionalSkills = optionalSkills.filter(s => !coreSet.has(s));

  return { coreSkills, optionalSkills };
}

/** Compare resume skills against job description skills. */
function compareWeightedSkills(resumeSkills, coreSkills, optionalSkills) {
  const resumeSet = new Set(resumeSkills.map(s => s.toLowerCase()));

  const matchedCoreSkills = coreSkills.filter(s => resumeSet.has(s.toLowerCase()));
  const missingCoreSkills = coreSkills.filter(s => !resumeSet.has(s.toLowerCase()));

  const matchedOptionalSkills = optionalSkills.filter(s => resumeSet.has(s.toLowerCase()));
  const missingOptionalSkills = optionalSkills.filter(s => !resumeSet.has(s.toLowerCase()));

  const coreMatchPercentage = coreSkills.length > 0 ? Math.round((matchedCoreSkills.length / coreSkills.length) * 100) : 0;
  const optionalMatchPercentage = optionalSkills.length > 0 ? Math.round((matchedOptionalSkills.length / optionalSkills.length) * 100) : 0;

  return {
    matchedCoreSkills,
    missingCoreSkills,
    matchedOptionalSkills,
    missingOptionalSkills,
    coreMatchPercentage,
    optionalMatchPercentage
  };
}

/** Calculate overall weighted ATS score. */
function calculateWeightedATSScore(comparison) {
  const {
    matchedCoreSkills,
    missingCoreSkills,
    matchedOptionalSkills,
    missingOptionalSkills
  } = comparison;

  const totalCore = matchedCoreSkills.length + missingCoreSkills.length;
  const totalOptional = matchedOptionalSkills.length + missingOptionalSkills.length;

  if (totalCore === 0 && totalOptional === 0) {
    return {
      atsScore: 0,
      explanation: 'No relevant skills found in the job description to evaluate.'
    };
  }

  const coreScore = totalCore > 0 ? (matchedCoreSkills.length / totalCore) * 100 : 0;
  const optionalScore = totalOptional > 0 ? (matchedOptionalSkills.length / totalOptional) * 100 : 0;

  let coreWeight = 0.7;
  let optionalWeight = 0.3;

  if (totalCore === 0) {
    coreWeight = 0;
    optionalWeight = 1.0;
  } else if (totalOptional === 0) {
    coreWeight = 1.0;
    optionalWeight = 0;
  }

  const atsScore = Math.round((coreScore * coreWeight) + (optionalScore * optionalWeight));

  let explanation = '';
  if (atsScore >= 80) {
    explanation = `Excellent match! Your profile aligns strongly with the requirements. `;
  } else if (atsScore >= 60) {
    explanation = `Good match! You meet most of the core requirements. `;
  } else if (atsScore >= 45) {
    explanation = `Moderate match. There are a few core skill gaps to fill. `;
  } else {
    explanation = `Low match. You are missing several key skills for this position. `;
  }

  if (totalCore > 0) {
    explanation += `Matched ${matchedCoreSkills.length}/${totalCore} core skills. `;
  }
  if (totalOptional > 0) {
    explanation += `Matched ${matchedOptionalSkills.length}/${totalOptional} preferred skills. `;
  }

  return { atsScore, explanation };
}

module.exports = {
  extractTextFromPdf,
  extractContactInfo,
  extractSkills,
  extractWeightedJDSkills,
  compareWeightedSkills,
  calculateWeightedATSScore
};
