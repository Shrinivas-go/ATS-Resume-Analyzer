/**
 * Score tiers — mirrors tierFor() in backend/analysis.js. The buckets match how
 * ats-scorer was evaluated (No fit < 40, Potential 40-64, Good fit >= 65).
 */
export function tierFor(score) {
  if (score >= 80) return { name: 'Strong match', note: 'ready to send' };
  if (score >= 65) return { name: 'Good match', note: 'close — polish the gaps' };
  if (score >= 40) return { name: 'Partial match', note: 'worth a rewrite pass' };
  return { name: 'Weak match', note: 'likely filtered out' };
}

/** Build the same result shape the /api/analyze endpoint returns, from a stored scan. */
export function resultFromHistory(scan) {
  const matched = scan.matchedSkills || [];
  const missing = scan.missingSkills || [];
  const tier = tierFor(scan.score);

  const keyStrengths = [];
  if (matched.length) {
    keyStrengths.push(`Matched ${matched.length} skills from the posting, including ${matched.slice(0, 3).join(', ')}.`);
  }
  const criticalGaps = missing
    .slice(0, 5)
    .map((s) => `Work the missing keyword '${s}' into your skills or experience, if it's true for you.`);

  return {
    fromHistory: true,
    engine: scan.engine || 'rules',
    score: scan.score,
    dimensions: scan.dimensions?.length ? scan.dimensions : null,
    savedReview: scan.review?.dimensions?.length || scan.profile ? { review: scan.review, profile: scan.profile } : null,
    jobTitle: scan.jobTitle,
    fileName: scan.filename,
    createdAt: scan.createdAt,
    explanation: `Saved scan from ${new Date(scan.createdAt).toLocaleDateString(undefined, { day: 'numeric', month: 'short', year: 'numeric' })}.`,
    predictedCategory: scan.predictedCategory,
    contactInfo: scan.contactInfo,
    details: {
      matchTier: tier.name,
      summary: 'This scan was saved before the full write-up was stored, so only the skills, score and contact details are shown. Run it again for the complete markup.',
      keyStrengths,
      criticalGaps,
    },
    skillsAnalyzed: {
      matchedCore: matched,
      missingCore: missing,
      matchedOptional: [],
      missingOptional: [],
    },
  };
}
