/**
 * Polls Controller Tests
 * 
 * Tests for polls endpoints:
 * - POST /polls (create)
 * - POST /polls/vote (vote)
 * - GET /polls (list with visibility)
 */

const { createMockSupabaseClient } = require('../mocks/supabase');

// Mock external dependencies
jest.mock('../../src/config/supabaseClient', () => {
    return require('../mocks/supabase').createMockSupabaseClient();
});

jest.mock('../../src/config/supabaseAdmin', () => {
    return require('../mocks/supabase').createMockSupabaseClient();
});

const pollsController = require('../../src/controllers/polls.controller');

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

describe('Polls Controller', () => {
    const mockUser = { id: 'user-123', email: 'test@example.com' };
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

            // Default empty for other tables
            chain.then = (cb) => cb({ data: [], error: null });
            return chain;
        });
    });

    describe('create', () => {
        it('should allow admin to create a poll', async () => {
            const req = createMockReq({
                title: 'Test Poll',
                options: ['A', 'B']
            });
            const res = createMockRes();

            mockSupabaseAdmin.from.mockImplementation((table) => {
                const chain = require('../mocks/supabase').createChainableMock();

                if (table === 'community_members') {
                    chain.single.mockResolvedValue({ data: mockMember, error: null });
                }
                if (table === 'member_roles') {
                    // Admin Role
                    chain.then = (cb) => cb({ data: [{ roles: { name: 'admin' } }], error: null });
                }
                if (table === 'polls') {
                    chain.insert = jest.fn().mockReturnValue({
                        select: jest.fn().mockReturnValue({
                            single: jest.fn().mockResolvedValue({ data: { id: 'poll-123' }, error: null })
                        })
                    });
                }

                // Default handler if not matched above
                if (!['community_members', 'member_roles', 'polls'].includes(table)) {
                    chain.then = (cb) => cb({ data: [], error: null });
                }

                return chain;
            });

            await pollsController.create(req, res);

            expect(res.status).toHaveBeenCalledWith(201);
            expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ id: 'poll-123' }));
        });

        it('should restrict vocal to own blocks', async () => {
            const req = createMockReq({
                title: 'Block Poll',
                options: ['Yes', 'No'],
                targetBlocks: ['block-456'] // Unauthorized block (mock will say vocal owns block-123 only)
            });
            const res = createMockRes();

            mockSupabaseAdmin.from.mockImplementation((table) => {
                const chain = require('../mocks/supabase').createChainableMock();

                if (table === 'community_members') chain.single.mockResolvedValue({ data: mockMember, error: null });

                if (table === 'member_roles') {
                    // Check if mocking "getMemberRoles" or "getVocalBlocks"
                    // The controller calls member_roles table separately for these.
                    // We need to return "vocal" for getMemberRoles
                    // And matching blocks for getVocalBlocks

                    // Since `getMemberRoles` selects 'roles(name)', and `getVocalBlocks` selects 'block_id, roles!inner(name)', we can differentiate by the select string or logic.
                    // BUT simplest mock is to return all potential data properties

                    chain.then = (cb) => cb({
                        data: [
                            { roles: { name: 'vocal' }, block_id: 'block-123' }
                        ],
                        error: null
                    });
                }

                return chain;
            });

            await pollsController.create(req, res);

            // Expect error because req targets 'block-456' but vocal only has 'block-123'
            expect(res.status).toHaveBeenCalledWith(403);
            expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ error: 'You can only create polls for blocks you represent' }));
        });
    });

    describe('vote', () => {
        it('should capture user vote', async () => {
            const req = createMockReq({
                poll_id: 'poll-1',
                option_id: 'opt-1',
                user_id: 'user-123'
            });
            const res = createMockRes();

            mockSupabaseAdmin.from.mockImplementation((table) => {
                const chain = require('../mocks/supabase').createChainableMock();
                if (table === 'polls') {
                    // Check ends_at
                    chain.single.mockResolvedValue({ data: { ends_at: null }, error: null });
                }
                if (table === 'poll_votes') {
                    chain.select.mockReturnValue({
                        // upsert returns created row
                        then: (cb) => cb({ data: [{ id: 'vote-1' }], error: null })
                    });
                }
                return chain;
            });

            await pollsController.vote(req, res);

            expect(res.status).toHaveBeenCalledWith(201);
        });

        it('should prevent voting if poll ended', async () => {
            const req = createMockReq({
                poll_id: 'poll-1',
                option_id: 'opt-1',
                user_id: 'user-123'
            });
            const res = createMockRes();

            mockSupabaseAdmin.from.mockImplementation((table) => {
                const chain = require('../mocks/supabase').createChainableMock();
                if (table === 'polls') {
                    // Determine past date
                    chain.single.mockResolvedValue({ data: { ends_at: '2020-01-01' }, error: null });
                }
                return chain;
            });

            await pollsController.vote(req, res);
            expect(res.status).toHaveBeenCalledWith(400);
            expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ error: 'Poll has ended' }));
        });
    });

    describe('getAll', () => {
        it('should list visibility filtered polls', async () => {
            // Mock scenario: 2 polls. One 'all', one 'blocks' (target block-999).
            // User is in block-123 only. User should NOT see the second poll.

            const polls = [
                { id: 1, target_type: 'all', title: 'Public Poll' },
                { id: 2, target_type: 'blocks', target_blocks: ['block-999'], title: 'Private Poll' }
            ];

            // User's direct unit -> block-123
            const userProfile = {
                unit_owners: [{ units: { block_id: 'block-123' } }]
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
                    // Regular resident
                    chain.then = (cb) => cb({ data: [{ roles: { name: 'resident' } }], error: null });
                }
                if (table === 'blocks') {
                    // Hierarchy check (mock no parents)
                    chain.single.mockResolvedValue({ data: { parent_id: null }, error: null });
                }
                if (table === 'polls') {
                    chain.then = (cb) => cb({ data: polls, error: null });
                }
                if (table === 'poll_votes') {
                    chain.then = (cb) => cb({ data: [], error: null });
                }
                return chain;
            });

            // Mock RPC for counts
            mockSupabaseAdmin.rpc.mockResolvedValue({ data: [], error: null });

            const req = createMockReq();
            const res = createMockRes();

            await pollsController.getAll(req, res);

            const responseData = res.json.mock.calls[0][0];
            expect(responseData).toHaveLength(1);
            expect(responseData[0].id).toBe(1);
        });

        it('should show all polls to admin', async () => {
            // Same polls, but user is admin
            const polls = [
                { id: 1, target_type: 'all', title: 'Public Poll' },
                { id: 2, target_type: 'blocks', target_blocks: ['block-999'], title: 'Private Poll' }
            ];

            mockSupabaseAdmin.from.mockImplementation((table) => {
                const chain = require('../mocks/supabase').createChainableMock();

                if (table === 'community_members') {
                    chain.single.mockResolvedValue({ data: mockMember, error: null });
                }
                if (table === 'member_roles') {
                    // Admin
                    chain.select = jest.fn().mockReturnThis();
                    chain.eq = jest.fn().mockReturnThis();
                    chain.then = (cb) => cb({ data: [{ roles: { name: 'admin' } }], error: null });
                }
                if (table === 'polls') {
                    chain.then = (cb) => cb({ data: polls, error: null });
                }
                // Default handler if not matched above
                if (!['community_members', 'member_roles', 'polls'].includes(table)) {
                    chain.then = (cb) => cb({ data: [], error: null });
                }
                return chain;
            });
            mockSupabaseAdmin.rpc.mockResolvedValue({ data: [], error: null });

            const req = createMockReq();
            const res = createMockRes();

            await pollsController.getAll(req, res);

            const responseData = res.json.mock.calls[0][0];
            expect(responseData).toHaveLength(2);
        });
    });
});
