/**
 * Maintenance Controller Coefficient Tests
 */

// Mock external dependencies
jest.mock('../../src/config/supabaseClient', () => {
    return require('../mocks/supabase').createMockSupabaseClient();
});

jest.mock('../../src/config/supabaseAdmin', () => {
    return require('../mocks/supabase').createMockSupabaseClient();
});

jest.mock('../../src/utils/sendEmail', () => jest.fn().mockResolvedValue(true));

const maintenanceController = require('../../src/controllers/maintenance.controller');
const mockSupabaseAdmin = require('../../src/config/supabaseAdmin');

// Testing helpers
const createMockReq = (body = {}, params = {}, query = {}, headers = {}) => ({
    body,
    params,
    query,
    headers: {
        authorization: 'Bearer valid-token',
        'x-community-id': 'community-123',
        ...headers
    }
});

const createMockRes = () => {
    const res = {};
    res.status = jest.fn().mockReturnValue(res);
    res.json = jest.fn().mockReturnValue(res);
    return res;
};

describe('Maintenance Controller - Coefficient Normalization', () => {
    const mockUser = { id: 'user-123', email: 'test@example.com' };
    const mockMember = {
        id: 'member-123', // Admin
        roles: { name: 'admin' },
        profile: { email: 'admin@example.com' }
    };
    const mockCommunity = { id: 'community-123', name: 'Test Comm', currency: 'USD' };

    beforeEach(() => {
        jest.clearAllMocks();

        // Setup default mocks
        require('../../src/config/supabaseClient').auth.getUser.mockResolvedValue({
            data: { user: mockUser },
            error: null
        });

        // Mock Supabase Admin behavior
        mockSupabaseAdmin.from.mockImplementation((table) => {
            const chain = {
                select: jest.fn().mockReturnThis(),
                eq: jest.fn().mockReturnThis(),
                in: jest.fn().mockReturnThis(), // Add .in() support
                single: jest.fn(),
                insert: jest.fn(),
                then: (cb) => cb({ data: [], error: null }) // Default
            };

            if (table === 'community_members') {
                chain.single.mockResolvedValue({ data: mockMember, error: null });
            }
            if (table === 'communities') {
                chain.single.mockResolvedValue({ data: mockCommunity, error: null });
                chain.in.mockReturnValue({ data: [{ id: 'community-123' }] });
            }

            return chain;
        });
    });

    it('should correctly normalize mixed decimal and percentage coefficients', async () => {
        // Scenario: 
        // Unit 1: 0.03 (3%) - Stored as decimal
        // Unit 2: 3.0 (3%) - Stored as percentage
        // Total Budget: 1000
        // Expect: Both get 30 (3% of 1000)

        const mockUnits = [
            { id: 1, unit_number: '101', coefficient: 0.03, unit_owners: [{ profile: { email: 'u1@test.com' } }] },
            { id: 2, unit_number: '102', coefficient: 3.0, unit_owners: [{ profile: { email: 'u2@test.com' } }] }
        ];

        let insertedData = [];

        mockSupabaseAdmin.from.mockImplementation((table) => {
            const chain = {
                select: jest.fn().mockReturnThis(),
                eq: jest.fn().mockReturnThis(),
                in: jest.fn().mockReturnThis(),
                single: jest.fn(),
                insert: jest.fn(),
                then: (cb) => cb({ data: [], error: null })
            };

            if (table === 'community_members') chain.single.mockResolvedValue({ data: mockMember, error: null });
            if (table === 'communities') {
                chain.single.mockResolvedValue({ data: mockCommunity, error: null });
                chain.in.mockReturnValue({ data: [{ id: 'community-123' }] });
            }
            // Mock units return
            if (table === 'units') {
                chain.then = (cb) => cb({ data: mockUnits, error: null });
            }

            // Mock monthly_fees insert
            if (table === 'monthly_fees') {
                // Return empty for "existing checks"
                chain.then = (cb) => cb({ data: [], error: null });

                chain.insert = jest.fn((data) => {
                    insertedData = data;
                    const mockResponse = data.map((d, i) => ({ ...d, id: i + 1 }));
                    return {
                        select: () => Promise.resolve({ data: mockResponse, error: null })
                    };
                });
            }
            return chain;
        });

        const req = createMockReq({
            period: '2023-01',
            total_amount: 1000,
            method: 'coefficient'
        });
        const res = createMockRes();

        await maintenanceController.generateMonthlyFees(req, res);

        expect(res.status).toHaveBeenCalledWith(201);
        expect(insertedData.length).toBe(2);

        // Verify Unit 1 (0.03) -> 1000 * 0.03 = 30
        expect(insertedData[0].amount).toBe(30);
        expect(insertedData[0].coefficient).toBe(0.03);

        // Verify Unit 2 (3.0) -> 1000 * (3.0/100) = 30
        expect(insertedData[1].amount).toBe(30);
        // We expect the stored coefficient to be normalized to 0.03
        expect(insertedData[1].coefficient).toBe(0.03);
    });
});
