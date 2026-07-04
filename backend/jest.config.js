module.exports = {
    testEnvironment: 'node',
    testMatch: [
        '<rootDir>/tests/**/*.test.js',
    ],
    collectCoverageFrom: [
        'ats_checker.js',
    ],
    testTimeout: 10000,
    verbose: true,
    clearMocks: true,
    forceExit: true,
};
