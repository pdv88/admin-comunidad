/**
 * Mock Supabase Client for Testing
 * 
 * This creates a mock Supabase client that can be configured
 * to return specific data for each test case.
 */

// Helper to create chainable mock methods
const createChainableMock = (returnData = { data: null, error: null }) => {
    const chain = {
        select: jest.fn().mockReturnThis(),
        insert: jest.fn().mockReturnThis(),
        update: jest.fn().mockReturnThis(),
        delete: jest.fn().mockReturnThis(),
        upsert: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        neq: jest.fn().mockReturnThis(),
        gt: jest.fn().mockReturnThis(),
        gte: jest.fn().mockReturnThis(),
        lt: jest.fn().mockReturnThis(),
        lte: jest.fn().mockReturnThis(),
        like: jest.fn().mockReturnThis(),
        ilike: jest.fn().mockReturnThis(),
        is: jest.fn().mockReturnThis(),
        in: jest.fn().mockReturnThis(),
        contains: jest.fn().mockReturnThis(),
        or: jest.fn().mockReturnThis(), // Added missing method
        not: jest.fn().mockReturnThis(),
        order: jest.fn().mockReturnThis(),
        limit: jest.fn().mockReturnThis(),
        range: jest.fn().mockReturnThis(),
        single: jest.fn().mockResolvedValue(returnData),
        maybeSingle: jest.fn().mockResolvedValue(returnData),
        // For terminal methods that return promises
        then: jest.fn((resolve) => resolve(returnData)),
    };

    // Make chain thenable (acts like a promise)
    chain[Symbol.toStringTag] = 'Promise';
    chain.then = jest.fn((onFulfilled) => Promise.resolve(returnData).then(onFulfilled));
    chain.catch = jest.fn((onRejected) => Promise.resolve(returnData).catch(onRejected));

    return chain;
};

// Create a configurable mock Supabase client
const createMockSupabaseClient = () => {
    const mockResponses = new Map();

    const client = {
        // Store mock responses for specific tables
        _mockResponses: mockResponses,

        // Configure mock response for a specific table
        mockResponse: (table, response) => {
            mockResponses.set(table, response);
        },

        // Reset all mock responses
        resetMocks: () => {
            mockResponses.clear();
        },

        // Main from() method
        from: jest.fn((table) => {
            const response = mockResponses.get(table) || { data: null, error: null };
            return createChainableMock(response);
        }),

        // Auth methods
        auth: {
            signUp: jest.fn().mockResolvedValue({ data: { user: null, session: null }, error: null }),
            signInWithPassword: jest.fn().mockResolvedValue({ data: { user: null, session: null }, error: null }),
            signOut: jest.fn().mockResolvedValue({ error: null }),
            getUser: jest.fn().mockResolvedValue({ data: { user: null }, error: null }),
            resetPasswordForEmail: jest.fn().mockResolvedValue({ data: {}, error: null }),
            updateUser: jest.fn().mockResolvedValue({ data: { user: null }, error: null }),
            admin: {
                createUser: jest.fn().mockResolvedValue({ data: { user: null }, error: null }),
                deleteUser: jest.fn().mockResolvedValue({ data: {}, error: null }),
                listUsers: jest.fn().mockResolvedValue({ data: { users: [] }, error: null }),
                updateUserById: jest.fn().mockResolvedValue({ data: { user: null }, error: null }),
                getUserById: jest.fn().mockResolvedValue({ data: { user: null }, error: null }),
                generateLink: jest.fn().mockResolvedValue({ data: { user: null, properties: {} }, error: null }),
            }
        },

        // Storage methods
        storage: {
            listBuckets: jest.fn().mockResolvedValue({ data: [], error: null }),
            createBucket: jest.fn().mockResolvedValue({ data: {}, error: null }),
            from: jest.fn(() => ({
                upload: jest.fn().mockResolvedValue({ data: { path: 'test/path' }, error: null }),
                download: jest.fn().mockResolvedValue({ data: new Blob(), error: null }),
                remove: jest.fn().mockResolvedValue({ data: [], error: null }),
                getPublicUrl: jest.fn().mockReturnValue({ data: { publicUrl: 'https://example.com/file' } }),
                list: jest.fn().mockResolvedValue({ data: [], error: null }),
            }))
        },

        // RPC calls
        rpc: jest.fn().mockResolvedValue({ data: null, error: null }),
    };

    return client;
};

// Export a default mock client instance
const mockSupabase = createMockSupabaseClient();

module.exports = {
    createMockSupabaseClient,
    mockSupabase,
    createChainableMock
};
