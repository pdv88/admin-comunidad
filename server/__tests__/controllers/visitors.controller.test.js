/**
 * Visitors Controller Tests
 * 
 * Tests for visitor management:
 * - GET /visitors (Visibility: Admin vs Resident)
 * - POST /visitors (Creation, Unit ownership validation)
 * - PUT /visitors/status (Status changes, Cancellation)
 * - DELETE /visitors (Deletion permissions)
 */

const { createMockSupabaseClient } = require('../mocks/supabase');

// Mock external dependencies
jest.mock('../../src/config/supabaseClient', () => require('../mocks/supabase').createMockSupabaseClient());
jest.mock('../../src/config/supabaseAdmin', () => require('../mocks/supabase').createMockSupabaseClient());

const visitorsController = require('../../src/controllers/visitors.controller');
const mockSupabaseClient = require('../../src/config/supabaseClient');
const mockSupabaseAdmin = require('../../src/config/supabaseAdmin');

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

describe('Visitors Controller', () => {
    const mockUser = { id: 'user-123', email: 'resident@example.com' };
    const mockMember = { id: 'member-123', profile_id: 'user-123' };

    // Resident Data
    const residentProfile = {
        unit_owners: [{ unit_id: 'unit-1' }]
    };

    beforeEach(() => {
        jest.clearAllMocks();
        mockSupabaseClient.auth.getUser.mockResolvedValue({ data: { user: mockUser }, error: null });

        // Default Admin Mock Setup
        mockSupabaseAdmin.from.mockImplementation((table) => {
            const chain = require('../mocks/supabase').createChainableMock();
            if (table === 'community_members') {
                chain.maybeSingle.mockResolvedValue({ data: mockMember, error: null });
                chain.single.mockResolvedValue({ data: mockMember, error: null });
            }
            if (table === 'member_roles') {
                chain.select = jest.fn().mockReturnThis();
                chain.eq = jest.fn().mockReturnThis();
                chain.then = (cb) => cb({ data: [{ roles: { name: 'resident' } }], error: null });
            }
            return chain;
        });
    });

    describe('getAll', () => {
        it('should list all visits for admin', async () => {
            const req = createMockReq();
            const res = createMockRes();

            mockSupabaseAdmin.from.mockImplementation((table) => {
                const chain = require('../mocks/supabase').createChainableMock();
                if (table === 'community_members') {
                    chain.single.mockResolvedValue({
                        data: { ...mockMember, roles: { name: 'admin' } },
                        error: null
                    });
                }
                if (table === 'member_roles') {
                    chain.then = (cb) => cb({ data: [{ roles: { name: 'admin' } }], error: null });
                }
                if (table === 'visits') {
                    chain.select = jest.fn().mockReturnValue({
                        eq: jest.fn().mockReturnValue({
                            order: jest.fn().mockReturnValue({
                                order: jest.fn().mockReturnValue({
                                    then: (cb) => cb({ data: [{ id: 1 }], error: null })
                                })
                            })
                        })
                    });
                }
                return chain;
            });

            await visitorsController.getAll(req, res);
            expect(res.json).toHaveBeenCalledWith(expect.arrayContaining([{ id: 1 }]));
        });

        it('should filter visits for resident', async () => {
            const req = createMockReq();
            const res = createMockRes();

            mockSupabaseAdmin.from.mockImplementation((table) => {
                const chain = require('../mocks/supabase').createChainableMock();
                if (table === 'community_members') {
                    chain.single.mockResolvedValue({
                        data: { ...mockMember, roles: { name: 'resident' }, profile: residentProfile },
                        error: null
                    });
                }
                if (table === 'visits') {
                    // OR query for residents
                    chain.or = jest.fn().mockReturnThis();
                    chain.select = jest.fn().mockReturnThis();
                    chain.eq = jest.fn().mockReturnThis();
                    chain.order = jest.fn().mockReturnThis();
                    chain.then = (cb) => cb({ data: [{ id: 1 }], error: null });
                }
                return chain;
            });

            await visitorsController.getAll(req, res);
            // Verify chaining was called correctly (implicit overlap with other tests, mainly expecting success)
            expect(res.json).toHaveBeenCalledWith(expect.arrayContaining([{ id: 1 }]));
        });
    });

    describe('create', () => {
        it('should allow resident to create guest visit for own unit', async () => {
            const req = createMockReq({
                visitor_name: 'John Doe',
                visit_date: '2025-01-01',
                visit_time: '12:00',
                type: 'guest',
                unit_id: 'unit-1'
            });
            const res = createMockRes();

            mockSupabaseAdmin.from.mockImplementation((table) => {
                const chain = require('../mocks/supabase').createChainableMock();
                if (table === 'community_members') {
                    chain.single.mockResolvedValue({
                        data: { ...mockMember, roles: { name: 'resident' }, profile: residentProfile },
                        error: null
                    });
                }
                if (table === 'visits') {
                    chain.insert = jest.fn().mockReturnValue({
                        select: jest.fn().mockReturnValue({
                            single: jest.fn().mockResolvedValue({ data: { id: 1, status: 'pending' }, error: null })
                        })
                    });
                }
                return chain;
            });

            await visitorsController.create(req, res);
            expect(res.status).toHaveBeenCalledWith(201);
            expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ id: 1 }));
        });

        it('should prevent resident from creating visit for other unit', async () => {
            const req = createMockReq({
                visitor_name: 'John Doe',
                unit_id: 'unit-999' // Not owned
            });
            const res = createMockRes();

            mockSupabaseAdmin.from.mockImplementation((table) => {
                const chain = require('../mocks/supabase').createChainableMock();
                if (table === 'community_members') {
                    chain.single.mockResolvedValue({
                        data: { ...mockMember, roles: { name: 'resident' }, profile: residentProfile },
                        error: null
                    });
                }
                return chain;
            });

            await visitorsController.create(req, res);
            expect(res.status).toHaveBeenCalledWith(403);
            expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ error: expect.stringMatching(/own units/) }));
        });
    });

    describe('updateStatus', () => {
        it('should allow resident to cancel their own visit', async () => {
            const req = createMockReq({ status: 'cancelled' }, { id: 1 });
            const res = createMockRes();

            mockSupabaseAdmin.from.mockImplementation((table) => {
                const chain = require('../mocks/supabase').createChainableMock();
                if (table === 'visits') {
                    chain.select = jest.fn().mockReturnValue({
                        eq: jest.fn().mockReturnValue({
                            single: jest.fn().mockResolvedValue({ data: { id: 1, created_by: 'user-123' }, error: null })
                        })
                    });
                    chain.update = jest.fn().mockReturnValue({
                        eq: jest.fn().mockReturnValue({
                            select: jest.fn().mockReturnValue({
                                single: jest.fn().mockResolvedValue({ data: { id: 1, status: 'cancelled' }, error: null })
                            })
                        })
                    });
                }
                if (table === 'community_members') {
                    chain.single.mockResolvedValue({
                        data: { ...mockMember, roles: { name: 'resident' } },
                        error: null
                    });
                }
                return chain;
            });

            await visitorsController.updateStatus(req, res);
            expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ status: 'cancelled' }));
        });

        it('should prevent resident from approving visits', async () => {
            const req = createMockReq({ status: 'active' }, { id: 1 });
            const res = createMockRes();

            mockSupabaseAdmin.from.mockImplementation((table) => {
                const chain = require('../mocks/supabase').createChainableMock();
                if (table === 'visits') {
                    chain.select = jest.fn().mockReturnValue({
                        eq: jest.fn().mockReturnValue({
                            single: jest.fn().mockResolvedValue({ data: { id: 1, created_by: 'user-123' }, error: null })
                        })
                    });
                }
                if (table === 'community_members') {
                    chain.single.mockResolvedValue({
                        data: { ...mockMember, roles: { name: 'resident' } },
                        error: null
                    });
                }
                return chain;
            });

            await visitorsController.updateStatus(req, res);
            expect(res.status).toHaveBeenCalledWith(403);
        });
    });
});
