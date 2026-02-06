/**
 * Reports Controller Tests
 * 
 * Tests for reports endpoints:
 * - GET /reports (visibility filtering)
 * - POST /reports (creation validation)
 * - PUT /reports/:id (update permissions)
 */

const { createMockSupabaseClient } = require('../mocks/supabase');

// Mock external dependencies
jest.mock('../../src/config/supabaseClient', () => {
    return require('../mocks/supabase').createMockSupabaseClient();
});

jest.mock('../../src/config/supabaseAdmin', () => {
    return require('../mocks/supabase').createMockSupabaseClient();
});

const reportsController = require('../../src/controllers/reports.controller');

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

describe('Reports Controller', () => {
    const mockUser = { id: 'user-123', email: 'resident@example.com' };
    const mockMember = { id: 'member-123', profile_id: 'user-123' };

    beforeEach(() => {
        jest.clearAllMocks();

        mockSupabaseClient.auth.getUser.mockResolvedValue({
            data: { user: mockUser },
            error: null
        });

        // Default Admin Mock Setup
        mockSupabaseAdmin.from.mockImplementation((table) => {
            const chain = require('../mocks/supabase').createChainableMock();

            if (table === 'community_members') {
                chain.single.mockResolvedValue({ data: mockMember, error: null });
            }
            if (table === 'member_roles') {
                chain.select = jest.fn().mockReturnThis();
                chain.eq = jest.fn().mockReturnThis();
                // Default resident
                chain.then = (cb) => cb({ data: [{ roles: { name: 'resident' } }], error: null });
            }

            // Default handler
            if (!['community_members', 'member_roles'].includes(table)) {
                chain.then = (cb) => cb({ data: [], error: null });
            }
            return chain;
        });
    });

    describe('getAll', () => {
        it('should allow admin to see all reports', async () => {
            const req = createMockReq({}, {}, { status: 'all' });
            const res = createMockRes();

            mockSupabaseAdmin.from.mockImplementation((table) => {
                const chain = require('../mocks/supabase').createChainableMock();

                if (table === 'community_members') chain.single.mockResolvedValue({ data: mockMember, error: null });
                if (table === 'member_roles') {
                    chain.select = jest.fn().mockReturnThis();
                    chain.eq = jest.fn().mockReturnThis();
                    chain.then = (cb) => cb({ data: [{ roles: { name: 'admin' } }], error: null });
                }
                if (table === 'reports') {
                    chain.select = jest.fn().mockReturnThis();
                    chain.eq = jest.fn().mockReturnThis();
                    // Admin query: just status filtering, no complex ORs
                    chain.range = jest.fn().mockReturnValue({
                        then: (cb) => cb({ data: [{ id: 1 }, { id: 2 }], count: 2, error: null })
                    });
                }

                if (!['community_members', 'member_roles', 'reports'].includes(table)) {
                    chain.then = (cb) => cb({ data: [], error: null });
                }
                return chain;
            });

            await reportsController.getAll(req, res);
            const responseData = res.json.mock.calls[0][0];
            expect(responseData.data).toHaveLength(2);
        });

        it('should list reports for resident (own + public in scope)', async () => {
            // Mock scenario: Resident owns unit in block-A.
            // Should see: Own reports, Public reports in block-A.
            // Should NOT see: Private reports in block-A, Public reports in block-B.

            // Since we rely on the query construction, we verify the `or` clause or just minimal functional path.
            // Here we just test it executes successfully.

            const req = createMockReq({}, {}, { status: 'all' });
            const res = createMockRes();

            // Profile with unit ownership
            const userProfile = {
                unit_owners: [{
                    unit_id: 'unit-1',
                    units: { block_id: 'block-A' }
                }]
            };

            mockSupabaseAdmin.from.mockImplementation((table) => {
                const chain = require('../mocks/supabase').createChainableMock();

                if (table === 'community_members') {
                    chain.single.mockResolvedValue({
                        data: { ...mockMember, profile: userProfile },
                        error: null
                    });
                }
                if (table === 'member_roles') {
                    chain.select = jest.fn().mockReturnThis();
                    chain.eq = jest.fn().mockReturnThis();
                    chain.then = (cb) => cb({ data: [{ roles: { name: 'resident' } }], error: null });
                }
                if (table === 'reports') {
                    // Resident query will use complex OR
                    chain.or = jest.fn().mockReturnThis();
                    chain.range = jest.fn().mockReturnValue({
                        then: (cb) => cb({ data: [{ id: 1 }], count: 1, error: null })
                    });
                }

                if (!['community_members', 'member_roles', 'reports'].includes(table)) {
                    chain.then = (cb) => cb({ data: [], error: null });
                }
                return chain;
            });

            await reportsController.getAll(req, res);
            expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ count: 1 }));
        });
    });

    describe('create', () => {
        // According to controller logic: Residents cannot create reports? 
        // Line 180: if (!isAdmin && !isVocal) returns 403.
        // "Residents (no roles... or only simple 'resident'...) are NOT allowed to create reports"
        // Wait, really? Usually residents report issues.
        // "Only representatives and admins can create reports." - Logic in controller.
        // Okay, checking the code:
        // `const isAdmin = ...; const isVocal = ...; if (!isAdmin && !isVocal) ...`
        // Yes. So regular resident creates fails.

        it('should prevent regular resident from creating a report', async () => {
            const req = createMockReq({
                title: 'Broken Light',
                category: 'maintenance'
            });
            const res = createMockRes();

            // Default mock is resident
            await reportsController.create(req, res);

            expect(res.status).toHaveBeenCalledWith(403);
            expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ error: expect.stringMatching(/Only representatives and admins/) }));
        });

        it('should allow vocal to create report for their block', async () => {
            const req = createMockReq({
                title: 'Block Issue',
                category: 'maintenance',
                block_id: 'block-123'
            });
            const res = createMockRes();

            mockSupabaseAdmin.from.mockImplementation((table) => {
                const chain = require('../mocks/supabase').createChainableMock();
                if (table === 'community_members') chain.single.mockResolvedValue({ data: mockMember, error: null });

                if (table === 'member_roles') {
                    chain.select = jest.fn().mockReturnThis();
                    chain.eq = jest.fn().mockReturnThis();
                    // Returning vocal role
                    // AND vocal block data for getVocalBlocks
                    chain.then = (cb) => cb({
                        data: [
                            { roles: { name: 'vocal' }, block_id: 'block-123' }
                        ],
                        error: null
                    });
                }

                if (table === 'reports') {
                    chain.insert = jest.fn().mockReturnValue({
                        select: jest.fn().mockReturnValue({
                            single: jest.fn().mockResolvedValue({ data: { id: 'report-1' }, error: null })
                        })
                    });
                }

                if (!['community_members', 'member_roles', 'reports'].includes(table)) {
                    chain.then = (cb) => cb({ data: [], error: null });
                }
                return chain;
            });

            await reportsController.create(req, res);
            expect(res.status).toHaveBeenCalledWith(201);
        });
    });

    describe('update', () => {
        it('should allow admin to update status', async () => {
            const req = createMockReq({ status: 'in_progress' }, { id: 'report-1' });
            const res = createMockRes();

            const mockReport = { id: 'report-1', community_id: 'community-123', status: 'pending' };

            mockSupabaseAdmin.from.mockImplementation((table) => {
                const chain = require('../mocks/supabase').createChainableMock();
                if (table === 'community_members') {
                    chain.single.mockResolvedValue({
                        data: { ...mockMember, roles: { name: 'admin' } }, // Admin Role direct on member for update logic
                        error: null
                    });
                }
                // getMemberRoles is not called in update?
                // Logic: `const role = member.roles?.name;`

                if (table === 'reports') {
                    // Select for fetch
                    chain.single.mockResolvedValue({ data: mockReport, error: null });
                    // Update
                    chain.update = jest.fn().mockReturnThis();
                }

                if (!['community_members', 'reports'].includes(table)) {
                    chain.then = (cb) => cb({ data: [], error: null });
                }
                return chain;
            });

            await reportsController.update(req, res);
            expect(res.json).toHaveBeenCalledWith({ message: 'Report updated' });
        });
    });
});
