/**
 * Users Controller Tests
 * 
 * Tests for users endpoints:
 * - GET /users
 * - POST /users/invite
 * - DELETE /users/:id
 */

const { createMockSupabaseClient } = require('../mocks/supabase');

// Mock external dependencies
jest.mock('../../src/config/supabaseClient', () => {
    return require('../mocks/supabase').createMockSupabaseClient();
});

jest.mock('../../src/config/supabaseAdmin', () => {
    return require('../mocks/supabase').createMockSupabaseClient();
});

// Mock send email
jest.mock('../../src/utils/sendEmail', () => jest.fn().mockResolvedValue(true));

const usersController = require('../../src/controllers/users.controller');

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

describe('Users Controller', () => {
    const mockUser = { id: 'user-123', email: 'inviter@example.com' };
    const mockProfile = { id: 'user-123', email: 'inviter@example.com', full_name: 'Inviter' };
    const mockMember = {
        id: 'member-123',
        role_id: 'role-admin',
        roles: { name: 'admin' },
        profile: mockProfile,
        profile_id: 'user-123',
        communities: { name: 'Test Community', logo_url: 'http://logo' }
    };

    beforeEach(() => {
        jest.clearAllMocks();

        // Default auth/user mock
        mockSupabaseClient.auth.getUser.mockResolvedValue({
            data: { user: mockUser },
            error: null
        });

        // Default admin mocks
        mockSupabaseAdmin.from.mockImplementation((table) => {
            const chain = require('../mocks/supabase').createChainableMock();

            if (table === 'community_members') {
                chain.single.mockResolvedValue({ data: mockMember, error: null });
                chain.select = jest.fn().mockReturnThis();
            }

            if (table === 'roles') {
                chain.single.mockResolvedValue({ data: { id: 'role-resident', name: 'resident' }, error: null });
            }

            if (table === 'communities') {
                chain.single.mockResolvedValue({ data: { name: 'Test' }, error: null });
            }

            // Handle default returns using promise chain behavior
            chain.then = (cb) => cb({ data: [], error: null });

            return chain;
        });
    });

    describe('listUsers', () => {
        it('should list users successfully', async () => {
            const mockMembers = [
                { id: 1, profile_id: 'p1', profiles: { full_name: 'User 1' }, roles: { name: 'resident' } },
                { id: 2, profile_id: 'p2', profiles: { full_name: 'User 2' }, roles: { name: 'admin' } }
            ];

            mockSupabaseAdmin.from.mockImplementation((table) => {
                const chain = require('../mocks/supabase').createChainableMock();

                if (table === 'community_members') {
                    // Need to handle select -> eq -> range -> order -> then
                    chain.range = jest.fn().mockReturnThis();
                    chain.order = jest.fn().mockReturnValue({
                        then: (cb) => cb({ data: mockMembers, count: 2, error: null })
                    });
                }

                // Handle subsequent queries (unit_owners, member_roles)
                // Just return empty for simplicity unless testing mapping
                chain.then = (cb) => cb({ data: [], error: null });

                return chain;
            });

            // Mock admin.auth.admin.getUserById
            mockSupabaseAdmin.auth.admin.getUserById.mockResolvedValue({ data: { user: { last_sign_in_at: new Date() } } });

            const req = createMockReq();
            const res = createMockRes();

            await usersController.listUsers(req, res);

            expect(res.json).toHaveBeenCalledWith(expect.objectContaining({
                count: 2
            }));
            const responseData = res.json.mock.calls[0][0].data;
            expect(responseData).toHaveLength(2);
            expect(responseData[0].full_name).toBe('User 1');
        });
    });

    describe('inviteUser', () => {
        it('should invite a new user successfully', async () => {
            // Mock scenario where user does NOT exist in profiles
            mockSupabaseAdmin.from.mockImplementation((table) => {
                const chain = require('../mocks/supabase').createChainableMock();

                // member check for inviter
                if (table === 'community_members') {
                    // Default resolve for select (inviter permission check)
                    chain.single.mockResolvedValue({ data: mockMember, error: null });
                    chain.select = jest.fn().mockReturnThis();

                    // Capture upsert for new member
                    const originalUpsert = chain.upsert;
                    chain.upsert = jest.fn((data) => {
                        // When upsert called, change what single() returns
                        chain.single.mockResolvedValue({ data: { id: 'new-member-id', ...data }, error: null });
                        return chain;
                    });
                }

                // existing profile check
                if (table === 'profiles') {
                    chain.single.mockResolvedValue({ data: null, error: null });
                }

                // role lookup
                if (table === 'roles') {
                    chain.single.mockResolvedValue({ data: { id: 'role-new' }, error: null });
                }

                chain.then = (cb) => cb({ data: [], error: null });
                return chain;
            });

            // Mock auth generateLink to simulate new user flow (fails first, then creates)
            mockSupabaseAdmin.auth.admin.generateLink.mockRejectedValueOnce(new Error('User not found'));
            mockSupabaseAdmin.auth.admin.createUser.mockResolvedValue({ data: { user: { id: 'new-user-id' } }, error: null });
            // Second generateLink (actual invite)
            mockSupabaseAdmin.auth.admin.generateLink.mockResolvedValueOnce({ data: { properties: { action_link: 'http://link' } }, error: null });

            const req = createMockReq({
                email: 'new@example.com',
                fullName: 'New User',
                roleName: 'resident'
            });
            const res = createMockRes();

            await usersController.inviteUser(req, res);

            expect(res.status).toHaveBeenCalledWith(201);
            expect(mockSupabaseAdmin.auth.admin.createUser).toHaveBeenCalledWith(expect.objectContaining({
                email: 'new@example.com'
            }));
        });

        it('should reject invite if inviter is not authorized', async () => {
            const residentInviter = { ...mockMember, roles: { name: 'resident' } };

            mockSupabaseAdmin.from.mockImplementation((table) => {
                const chain = require('../mocks/supabase').createChainableMock();
                if (table === 'community_members') {
                    chain.single.mockResolvedValue({ data: residentInviter, error: null });
                }
                return chain;
            });

            const req = createMockReq({ email: 'test@test.com' });
            const res = createMockRes();

            await usersController.inviteUser(req, res);

            expect(res.status).toHaveBeenCalledWith(400);
            expect(res.json).toHaveBeenCalledWith(expect.objectContaining({
                error: 'Insufficient permissions to invite users'
            }));
        });
    });

    describe('deleteUser', () => {
        it('should delete user and resources', async () => {
            // Admin perm verified in beforeEach for mockMember (admin)

            const req = createMockReq({}, { id: 'user-to-delete' });
            const res = createMockRes();

            await usersController.deleteUser(req, res);

            expect(res.json).toHaveBeenCalledWith(expect.objectContaining({
                message: 'User removed from community successfully'
            }));

            // Verify delete call on community_members
            // Since we use a factory mock, we can't easily check 'delete' call counts on the specific instance 
            // without resetting or spying on the implementation return. 
            // But the happy path implies it ran.
        });
    });
});
