/**
 * Global test setup for Jest
 * Runs before each test file
 */

// Set test environment variables
process.env.NODE_ENV = 'test';

// Increase timeout for async operations if needed
jest.setTimeout(10000);

// Global beforeAll hook
beforeAll(() => {
    // Silence console logs during tests (optional - comment out for debugging)
    // jest.spyOn(console, 'log').mockImplementation(() => {});
    // jest.spyOn(console, 'error').mockImplementation(() => {});
});

// Global afterAll hook
afterAll(() => {
    // Clean up any global resources
    jest.restoreAllMocks();
});

// Custom matchers (optional, add as needed)
expect.extend({
    toBeValidUUID(received) {
        const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
        const pass = uuidRegex.test(received);
        return {
            message: () => pass
                ? `expected ${received} not to be a valid UUID`
                : `expected ${received} to be a valid UUID`,
            pass
        };
    }
});
