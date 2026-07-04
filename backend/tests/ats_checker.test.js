const {
    extractSkills,
    extractWeightedJDSkills,
    compareWeightedSkills,
    calculateWeightedATSScore
} = require('../ats_checker');

describe('ATS Checker Utilities', () => {

    describe('extractSkills', () => {
        test('should extract known skills from resume text', () => {
            const text = "Highly experienced software developer skilled in JavaScript, React, Node.js, and Python.";
            const skills = extractSkills(text);
            expect(skills).toContain('JavaScript');
            expect(skills).toContain('React');
            expect(skills).toContain('Node.js');
            expect(skills).toContain('Python');
            expect(skills).not.toContain('Docker');
        });

        test('should match skills case-insensitively', () => {
            const text = "skilful in javascript, REACT, and DOCKER";
            const skills = extractSkills(text);
            expect(skills).toContain('JavaScript');
            expect(skills).toContain('React');
            expect(skills).toContain('Docker');
        });
    });

    describe('extractWeightedJDSkills', () => {
        test('should separate core and optional skills based on keywords', () => {
            const jdText = "We are hiring! Required skills: JavaScript, React. Nice to have: Docker, AWS.";
            const { coreSkills, optionalSkills } = extractWeightedJDSkills(jdText);
            
            expect(coreSkills).toContain('JavaScript');
            expect(coreSkills).toContain('React');
            expect(optionalSkills).toContain('Docker');
            expect(optionalSkills).toContain('AWS');
        });

        test('should default all to core if no keywords are present', () => {
            const jdText = "Skills needed: JavaScript, Python.";
            const { coreSkills, optionalSkills } = extractWeightedJDSkills(jdText);
            
            expect(coreSkills).toContain('JavaScript');
            expect(coreSkills).toContain('Python');
            expect(optionalSkills).toHaveLength(0);
        });
    });

    describe('compareWeightedSkills', () => {
        test('should calculate correct match counts and percentages', () => {
            const resumeSkills = ['JavaScript', 'React', 'Docker'];
            const coreSkills = ['JavaScript', 'React', 'Node.js'];
            const optionalSkills = ['Docker', 'AWS'];

            const result = compareWeightedSkills(resumeSkills, coreSkills, optionalSkills);

            expect(result.matchedCoreSkills).toContain('JavaScript');
            expect(result.matchedCoreSkills).toContain('React');
            expect(result.missingCoreSkills).toContain('Node.js');

            expect(result.matchedOptionalSkills).toContain('Docker');
            expect(result.missingOptionalSkills).toContain('AWS');

            expect(result.coreMatchPercentage).toBe(67); // 2 out of 3
            expect(result.optionalMatchPercentage).toBe(50); // 1 out of 2
        });
    });

    describe('calculateWeightedATSScore', () => {
        test('should compute overall score using 70/30 weight split', () => {
            const comparison = {
                matchedCoreSkills: ['JavaScript', 'React'],
                missingCoreSkills: ['Node.js'],
                matchedOptionalSkills: ['Docker'],
                missingOptionalSkills: ['AWS']
            };

            // Core score: 66.66% -> 66.66 * 0.7 = 46.66
            // Optional score: 50.00% -> 50 * 0.3 = 15.00
            // Total score: ~62%
            const { atsScore, explanation } = calculateWeightedATSScore(comparison);
            expect(atsScore).toBeGreaterThanOrEqual(60);
            expect(atsScore).toBeLessThanOrEqual(63);
            expect(explanation).toContain('Good Match!');
        });
    });
});
