/**
 * Resume analysis pipeline.
 *
 *   1. Rules (always, fast): contact details, skills found/missing in the posting,
 *      field classifier, structural checks (projects, action verbs, numbers).
 *   2. ats-scorer (model service): the match score as five dimension scores.
 *      If the service is unavailable, the rules score is used and `engine` says so.
 *   3. ats-lm (model service, background): a reason for each dimension, a summary and
 *      a structured profile. Returned later through /api/review/:id.
 */
const ml = require('./ml_client');
const {
    extractContactInfo,
    extractSkills,
    extractWeightedJDSkills,
    compareWeightedSkills,
    calculateWeightedATSScore,
    predictCategoryAndConfidence,
} = require('./ats_checker');

const DIMENSIONS = [
    { name: 'skills_match', label: 'Skills match' },
    { name: 'experience_relevance', label: 'Experience' },
    { name: 'education_certifications', label: 'Education & certifications' },
    { name: 'industry_domain_fit', label: 'Industry fit' },
    { name: 'seniority_role_alignment', label: 'Seniority' },
];

/** Same buckets the scorer was evaluated on (No fit < 40, Potential 40-64, Good >= 65). */
function tierFor(score) {
    if (score >= 80) return 'Strong match';
    if (score >= 65) return 'Good match';
    if (score >= 40) return 'Partial match';
    return 'Weak match';
}

async function analyze({ resumeText, jobDescription, jobTitle }) {
    const contactInfo = extractContactInfo(resumeText);
    const resumeSkills = extractSkills(resumeText);
    const { coreSkills, optionalSkills } = extractWeightedJDSkills(jobDescription);
    const comparison = compareWeightedSkills(resumeSkills, coreSkills, optionalSkills, resumeText);
    const rules = calculateWeightedATSScore(comparison, resumeText, jobDescription, null);
    const prediction = predictCategoryAndConfidence(resumeText);

    const scored = await ml.score({ resume: resumeText, job: jobDescription, jobTitle });

    const score = scored ? scored.total : rules.atsScore;
    const dimensions = scored
        ? scored.dimensions.map((d, i) => ({ ...DIMENSIONS[i], score: d.score, max: 20 }))
        : null;
    const lowest = dimensions ? [...dimensions].sort((a, b) => a.score - b.score)[0] : null;

    return {
        success: true,
        engine: scored ? 'ats-scorer' : 'rules',
        score,
        dimensions,
        explanation: scored
            ? `${tierFor(score)}. Weakest area: ${lowest.label.toLowerCase()} (${lowest.score}/20).`
            : rules.explanation,
        details: {
            matchTier: tierFor(score),
            summary: rules.details?.summary || '',
            keyStrengths: rules.details?.keyStrengths || [],
            criticalGaps: rules.details?.criticalGaps || [],
        },
        predictedCategory: prediction.category,
        predictionConfidence: (rules.confidence || 0) / 100,
        contactInfo,
        skillsAnalyzed: {
            resumeSkillsCount: resumeSkills.length,
            matchedCoreCount: comparison.matchedCoreSkills.length,
            missingCoreCount: comparison.missingCoreSkills.length,
            matchedCore: comparison.matchedCoreSkills,
            missingCore: comparison.missingCoreSkills,
            matchedOptional: comparison.matchedOptionalSkills,
            missingOptional: comparison.missingOptionalSkills,
        },
        _comparison: comparison,
    };
}

/** Background work for ats-lm. Resolves to { review, profile } or null. */
function reviewWork({ resumeText, jobDescription, jobTitle, dimensions }) {
    return async () => {
        const review = await ml.review({
            resume: resumeText,
            job: jobDescription,
            jobTitle,
            dims: dimensions.map((d) => d.score),
        });
        const profile = await ml.parse({ resume: resumeText });
        if (!review && !profile) return null;
        return {
            review: review
                ? {
                    summary: review.summary,
                    dimensions: review.dimensions.map((d, i) => ({ ...DIMENSIONS[i], score: d.score, reason: d.reason })),
                }
                : null,
            profile,
        };
    };
}

module.exports = { analyze, reviewWork, tierFor, DIMENSIONS };
