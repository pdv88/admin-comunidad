module.exports = {
    testEnvironment: 'node',
    roots: ['<rootDir>/__tests__'],
    testMatch: ['**/*.test.js'],
    setupFilesAfterEnv: ['<rootDir>/__tests__/setup.js'],
    collectCoverageFrom: [
        'src/**/*.js',
        '!src/config/**',
        '!**/node_modules/**'
    ],
    coverageDirectory: 'coverage',
    verbose: true,
    testTimeout: 10000,
    // Clear mocks between tests
    clearMocks: true,
    resetMocks: true
};
