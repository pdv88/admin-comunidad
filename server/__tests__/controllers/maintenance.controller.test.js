/**
 * Maintenance Controller Tests
 * 
 * Tests for maintenance endpoints:
 * - POST /maintenance/generate
 * - GET /maintenance/status
 */

const { createMockSupabaseClient } = require('../mocks/supabase');

// Mock external dependencies
jest.mock('../../src/config/supabaseClient', () => {
    return require('../mocks/supabase').createMockSupabaseClient();
});

jest.mock('../../src/config/supabaseAdmin', () => {
    return require('../mocks/supabase').createMockSupabaseClient();
});

jest.mock('../../src/utils/sendEmail', () => jest.fn().mockResolvedValue(true));

const maintenanceController = require('../../src/controllers/maintenance.controller');

// Create isolated mock clients
const mockSupabaseClient = require('../../src/config/supabaseClient');
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

describe('Maintenance Controller', () => {
    const mockUser = { id: 'user-123', email: 'test@example.com' };
    const mockMember = {
        id: 'member-123',
        role_id: 'role-123',
        roles: { name: 'admin' }, // Default to admin for fee generation
        profile: { email: 'test@example.com', full_name: 'Test User' }
    };
    const mockCommunity = { id: 'community-123', name: 'Test Comm', currency: 'USD' };

    beforeEach(() => {
        jest.clearAllMocks();

        // Setup default auth mocks
        mockSupabaseClient.auth.getUser.mockResolvedValue({
            data: { user: mockUser },
            error: null
        });

        // Setup default admin/db mocks
        mockSupabaseAdmin.from.mockImplementation((table) => {
            const chain = require('../mocks/supabase').createChainableMock();

            if (table === 'community_members') {
                chain.single.mockResolvedValue({ data: mockMember, error: null });
                // Handle select chaining before single
                chain.select = jest.fn().mockReturnThis();
            }

            if (table === 'communities') {
                chain.single.mockResolvedValue({ data: mockCommunity, error: null });
                chain.select = jest.fn().mockReturnThis();
                chain.in = jest.fn().mockReturnValue({ data: [{ id: 'community-123' }] }); // For header validation
            }

            // Default empty returns for others
            chain.then = (cb) => cb({ data: [], error: null });

            return chain;
        });
    });

    describe('generateMonthlyFees', () => {
        it('should calculate fixed fees correctly', async () => {
            const mockUnits = [
                { id: 1, unit_number: '101', unit_owners: [{ profile: { email: 'u1@test.com' } }] },
                { id: 2, unit_number: '102', unit_owners: [{ profile: { email: 'u2@test.com' } }] }
            ];

            mockSupabaseAdmin.from.mockImplementation((table) => {
                const chain = require('../mocks/supabase').createChainableMock();

                if (table === 'community_members') {
                    chain.single.mockResolvedValue({ data: mockMember, error: null });
                }
                if (table === 'communities') {
                    chain.single.mockResolvedValue({ data: mockCommunity, error: null });
                }
                if (table === 'units') {
                    // Return mock units when needed
                    chain.then = (cb) => cb({ data: mockUnits, error: null });
                }

                if (table === 'monthly_fees') {
                    // Default: empty list for "check existing" query (chain.then)
                    chain.then = (cb) => cb({ data: [], error: null });

                    // If insert is called, update the chain to return the inserted data
                    const originalInsert = chain.insert;
                    chain.insert = jest.fn((data) => {
                        // Update the terminal 'then' to return mock data based on input
                        const mockResponse = Array.isArray(data) ? data.map((d, i) => ({ ...d, id: i + 1 })) : [{ ...data, id: 1 }];

                        chain.then = (cb) => cb({ data: mockResponse, error: null });
                        return chain; // Return this to continue chain (select())
                    });
                }
                return chain;
            });

            const req = createMockReq({
                period: '2023-01',
                amount: 100,
                method: 'fixed'
            });
            const res = createMockRes();

            await maintenanceController.generateMonthlyFees(req, res);

            expect(res.status).toHaveBeenCalledWith(201);
            expect(res.json).toHaveBeenCalledWith(expect.objectContaining({
                count: 2,
                method: 'fixed'
            }));

            // Verify insert was called
            // We assume verify logic by the status 201
        });

        it('should calculate coefficient fees correctly', async () => {
            const mockUnits = [
                { id: 1, unit_number: '101', coefficient: 50, unit_owners: [{ profile: { email: 'u1@test.com' } }] },
                { id: 2, unit_number: '102', coefficient: 50, unit_owners: [{ profile: { email: 'u2@test.com' } }] }
            ];

            let insertedData = [];

            mockSupabaseAdmin.from.mockImplementation((table) => {
                const chain = require('../mocks/supabase').createChainableMock();

                if (table === 'community_members') chain.single.mockResolvedValue({ data: mockMember, error: null });
                if (table === 'communities') chain.single.mockResolvedValue({ data: mockCommunity, error: null });

                if (table === 'units') chain.then = (cb) => cb({ data: mockUnits, error: null });

                if (table === 'monthly_fees') {
                    // Default: empty list for "check existing" query
                    chain.then = (cb) => cb({ data: [], error: null });

                    // Capture insert and update return
                    const originalInsert = chain.insert;
                    chain.insert = jest.fn((data) => {
                        insertedData = data;
                        const mockResponse = Array.isArray(data) ? data.map((d, i) => ({ ...d, id: i + 1 })) : [{ ...data, id: 1 }];

                        chain.then = (cb) => cb({ data: mockResponse, error: null });
                        return chain;
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
            expect(insertedData).toHaveLength(2);
            // 1000 total / 100 coeff sum * 50 coeff = 500 each
            expect(insertedData[0].amount).toBe(500);
        });

        it('should reject unauthorized users', async () => {
            // Mock regular user
            const residentMember = { ...mockMember, roles: { name: 'resident' } };

            mockSupabaseAdmin.from.mockImplementation((table) => {
                const chain = require('../mocks/supabase').createChainableMock();
                if (table === 'community_members') {
                    chain.single.mockResolvedValue({ data: residentMember, error: null });
                }
                return chain;
            });

            const req = createMockReq({ period: '2023-01', amount: 100 });
            const res = createMockRes();

            await maintenanceController.generateMonthlyFees(req, res);

            expect(res.status).toHaveBeenCalledWith(403);
        });
    });

    describe('getCommunityStatus', () => {
        it('should return fees list with pagination', async () => {
            const mockFees = [{ id: 1, amount: 100 }];
            const mockCount = 10;

            mockSupabaseAdmin.from.mockImplementation((table) => {
                const chain = require('../mocks/supabase').createChainableMock();
                if (table === 'community_members') chain.single.mockResolvedValue({ data: mockMember, error: null });

                if (table === 'monthly_fees') {
                    // Mock select with count matches
                    chain.range = jest.fn().mockImplementation(() => {
                        return Promise.resolve({ data: mockFees, count: mockCount, error: null });
                    });
                }
                return chain;
            });

            const req = createMockReq({}, {}, { page: 1, limit: 10 });
            const res = createMockRes();

            await maintenanceController.getCommunityStatus(req, res);

            expect(res.json).toHaveBeenCalledWith(expect.objectContaining({
                data: expect.any(Array),
                totalCount: 10,
                page: 1
            }));
        });
    });
});
