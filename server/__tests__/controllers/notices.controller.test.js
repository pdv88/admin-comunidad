/**
 * Notices Controller Tests
 * 
 * Tests for notices:
 * - GET /notices (Visibility: Admin vs Resident/Vocal)
 * - POST /notices (Creation permissions, Scope)
 * - DELETE /notices (Deletion permissions)
 */

const { createMockSupabaseClient } = require('../mocks/supabase');

// Mock external dependencies
jest.mock('../../src/config/supabaseClient', () => require('../mocks/supabase').createMockSupabaseClient());
jest.mock('../../src/config/supabaseAdmin', () => require('../mocks/supabase').createMockSupabaseClient());

const noticesController = require('../../src/controllers/notices.controller');
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

describe('Notices Controller', () => {
    const mockUser = { id: 'user-123', email: 'resident@example.com' };
    const mockMember = { id: 'member-123', profile_id: 'user-123' };

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
        it('should list all notices for admin', async () => {
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
                if (table === 'notices') {
                    // Admin gets simple query
                    chain.select = jest.fn().mockReturnValue({
                        eq: jest.fn().mockReturnValue({
                            order: jest.fn().mockReturnValue({
                                then: (cb) => cb({ data: [{ id: 1 }], error: null })
                            })
                        })
                    });
                }
                return chain;
            });

            await noticesController.getAll(req, res);
            expect(res.json).toHaveBeenCalledWith(expect.arrayContaining([{ id: 1 }]));
        });

        it('should filter notices for resident', async () => {
            const req = createMockReq();
            const res = createMockRes();

            // Resident in Block A
            const residentProfile = {
                unit_owners: [{ units: { block_id: 'block-A' } }]
            };

            mockSupabaseAdmin.from.mockImplementation((table) => {
                const chain = require('../mocks/supabase').createChainableMock();
                if (table === 'community_members') {
                    chain.single.mockResolvedValue({
                        data: { ...mockMember, roles: { name: 'resident' }, profile: residentProfile },
                        error: null
                    });
                }
                if (table === 'notices') {
                    // Use standard chain to support .or() after .order()
                    chain.select = jest.fn().mockReturnThis();
                    chain.eq = jest.fn().mockReturnThis();
                    chain.order = jest.fn().mockReturnThis();
                    chain.or = jest.fn().mockReturnThis();
                    chain.then = (cb) => cb({ data: [{ id: 1 }], error: null });
                }
                return chain;
            });

            await noticesController.getAll(req, res);
            expect(res.json).toHaveBeenCalledWith(expect.arrayContaining([{ id: 1 }]));
        });
    });

    describe('create', () => {
        it('should prevent resident from creating notice', async () => {
            const req = createMockReq({ title: 'Test' });
            const res = createMockRes();

            await noticesController.create(req, res);
            expect(res.status).toHaveBeenCalledWith(403);
        });

        it('should allow vocal to create notice for their block', async () => {
            const req = createMockReq({ title: 'Block Notice', block_id: 'block-A' });
            const res = createMockRes();

            mockSupabaseAdmin.from.mockImplementation((table) => {
                const chain = require('../mocks/supabase').createChainableMock();
                if (table === 'community_members') chain.single.mockResolvedValue({ data: mockMember, error: null });

                if (table === 'member_roles') {
                    chain.select = jest.fn().mockReturnThis();
                    chain.eq = jest.fn().mockReturnThis();
                    // Vocal Role + Block A
                    chain.then = (cb) => cb({ data: [{ roles: { name: 'vocal' }, block_id: 'block-A' }], error: null });
                }

                if (table === 'notices') {
                    chain.insert = jest.fn().mockReturnValue({
                        select: jest.fn().mockReturnValue({
                            single: jest.fn().mockResolvedValue({ data: { id: 1 }, error: null })
                        })
                    });
                }
                return chain;
            });

            await noticesController.create(req, res);
            expect(res.status).toHaveBeenCalledWith(201);
        });

        it('should enforce vocal block scope', async () => {
            const req = createMockReq({ title: 'Block Notice', block_id: 'block-B' }); // Wrong block
            const res = createMockRes();

            mockSupabaseAdmin.from.mockImplementation((table) => {
                const chain = require('../mocks/supabase').createChainableMock();
                if (table === 'community_members') chain.single.mockResolvedValue({ data: mockMember, error: null });

                if (table === 'member_roles') {
                    chain.select = jest.fn().mockReturnThis();
                    chain.eq = jest.fn().mockReturnThis();
                    // Vocal Role + Block A (NOT B)
                    chain.then = (cb) => cb({ data: [{ roles: { name: 'vocal' }, block_id: 'block-A' }], error: null });
                }
                return chain;
            });

            await noticesController.create(req, res);
            expect(res.status).toHaveBeenCalledWith(403);
            expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ error: expect.stringMatching(/assigned blocks/) }));
        });
    });
});
