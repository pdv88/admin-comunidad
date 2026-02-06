/**
 * Auth Controller Tests
 * 
 * Tests for authentication endpoints:
 * - POST /auth/register
 * - POST /auth/login
 * - GET /auth/me
 * - PUT /auth/password
 */

const { createMockSupabaseClient } = require('../mocks/supabase');

// Mock the supabase clients before requiring the controller
jest.mock('../../src/config/supabaseClient', () => {
    const mockClient = require('../mocks/supabase').createMockSupabaseClient();
    return mockClient;
});

jest.mock('../../src/config/supabaseAdmin', () => {
    const mockAdmin = require('../mocks/supabase').createMockSupabaseClient();
    return mockAdmin;
});

// Mock email sender
jest.mock('../../src/utils/sendEmail', () => jest.fn().mockResolvedValue(true));

const authController = require('../../src/controllers/auth.controller');

// Helper to create mock request/response objects
const createMockReq = (body = {}, headers = {}) => ({
    body,
    headers,
});

const createMockRes = () => {
    const res = {};
    res.status = jest.fn().mockReturnValue(res);
    res.json = jest.fn().mockReturnValue(res);
    return res;
};

describe('Auth Controller', () => {
    let mockSupabaseClient;
    let mockSupabaseAdmin;

    beforeEach(() => {
        jest.clearAllMocks();
        mockSupabaseClient = require('../../src/config/supabaseClient');
        mockSupabaseAdmin = require('../../src/config/supabaseAdmin');
    });

    describe('register', () => {
        it('should return 400 if communityName is not provided', async () => {
            const req = createMockReq({
                email: 'test@example.com',
                password: 'password123',
                fullName: 'Test User'
                // No communityName
            });
            const res = createMockRes();

            await authController.register(req, res);

            expect(res.status).toHaveBeenCalledWith(400);
            expect(res.json).toHaveBeenCalledWith({
                error: 'Community Name is required for new registration.'
            });
        });

        it('should handle successful registration', async () => {
            const mockCommunity = { id: 'community-123', name: 'Test Community' };
            const mockUser = { id: 'user-123', email: 'test@example.com' };
            const mockRole = { id: 'role-123' };
            const mockMember = { id: 'member-123' };

            // Configure mock responses
            mockSupabaseAdmin.from.mockImplementation((table) => {
                const chain = {
                    insert: jest.fn().mockReturnThis(),
                    select: jest.fn().mockReturnThis(),
                    upsert: jest.fn().mockReturnThis(),
                    eq: jest.fn().mockReturnThis(),
                    single: jest.fn().mockImplementation(() => {
                        if (table === 'communities') {
                            return Promise.resolve({ data: mockCommunity, error: null });
                        }
                        if (table === 'roles') {
                            return Promise.resolve({ data: mockRole, error: null });
                        }
                        if (table === 'community_members') {
                            return Promise.resolve({ data: mockMember, error: null });
                        }
                        return Promise.resolve({ data: null, error: null });
                    }),
                };
                return chain;
            });

            mockSupabaseAdmin.auth.admin.generateLink.mockResolvedValue({
                data: {
                    user: mockUser,
                    properties: { action_link: 'https://example.com/verify' }
                },
                error: null
            });

            const req = createMockReq({
                email: 'test@example.com',
                password: 'password123',
                fullName: 'Test User',
                communityName: 'Test Community',
                communityAddress: '123 Test St'
            });
            const res = createMockRes();

            await authController.register(req, res);

            expect(res.status).toHaveBeenCalledWith(201);
            expect(res.json).toHaveBeenCalledWith(expect.objectContaining({
                message: expect.stringContaining('Community and Admin created successfully')
            }));
        });

        it('should return 400 if email already exists', async () => {
            mockSupabaseAdmin.from.mockImplementation(() => ({
                insert: jest.fn().mockReturnThis(),
                select: jest.fn().mockReturnThis(),
                delete: jest.fn().mockReturnThis(),
                eq: jest.fn().mockReturnThis(),
                single: jest.fn().mockResolvedValue({
                    data: { id: 'community-123' },
                    error: null
                }),
            }));

            mockSupabaseAdmin.auth.admin.generateLink.mockResolvedValue({
                data: null,
                error: { code: 'email_exists', message: 'User already registered' }
            });

            const req = createMockReq({
                email: 'existing@example.com',
                password: 'password123',
                fullName: 'Existing User',
                communityName: 'Test Community'
            });
            const res = createMockRes();

            await authController.register(req, res);

            expect(res.status).toHaveBeenCalledWith(400);
            expect(res.json).toHaveBeenCalledWith(expect.objectContaining({
                error: expect.stringContaining('already exists')
            }));
        });
    });

    describe('login', () => {
        it('should return 401 for invalid credentials', async () => {
            mockSupabaseClient.auth.signInWithPassword.mockResolvedValue({
                data: null,
                error: { message: 'Invalid login credentials' }
            });

            const req = createMockReq({
                email: 'test@example.com',
                password: 'wrongpassword'
            });
            const res = createMockRes();

            await authController.login(req, res);

            expect(res.status).toHaveBeenCalledWith(401);
            expect(res.json).toHaveBeenCalledWith({
                error: 'Invalid login credentials'
            });
        });

        it('should return 200 with token for valid credentials', async () => {
            const mockUser = { id: 'user-123', email: 'test@example.com' };
            const mockSession = { access_token: 'valid-token-123' };
            const mockProfile = { id: 'user-123', full_name: 'Test User' };

            mockSupabaseClient.auth.signInWithPassword.mockResolvedValue({
                data: { user: mockUser, session: mockSession },
                error: null
            });

            mockSupabaseAdmin.from.mockImplementation((table) => ({
                select: jest.fn().mockReturnThis(),
                eq: jest.fn().mockReturnThis(),
                in: jest.fn().mockReturnThis(),
                single: jest.fn().mockResolvedValue({
                    data: table === 'profiles' ? mockProfile : null,
                    error: null
                }),
                then: jest.fn((cb) => cb({ data: [], error: null })),
            }));

            const req = createMockReq({
                email: 'test@example.com',
                password: 'correctpassword'
            });
            const res = createMockRes();

            await authController.login(req, res);

            expect(res.status).toHaveBeenCalledWith(200);
            expect(res.json).toHaveBeenCalledWith(expect.objectContaining({
                message: 'Login successful',
                token: 'valid-token-123'
            }));
        });
    });

    describe('getMe', () => {
        it('should return 401 if no token provided', async () => {
            const req = createMockReq({}, {}); // No authorization header
            const res = createMockRes();

            await authController.getMe(req, res);

            expect(res.status).toHaveBeenCalledWith(401);
            expect(res.json).toHaveBeenCalledWith({
                error: 'No token provided'
            });
        });

        it('should return 401 for invalid token', async () => {
            mockSupabaseClient.auth.getUser.mockResolvedValue({
                data: { user: null },
                error: { message: 'Invalid token' }
            });

            const req = createMockReq({}, { authorization: 'Bearer invalid-token' });
            const res = createMockRes();

            await authController.getMe(req, res);

            expect(res.status).toHaveBeenCalledWith(401);
        });

        it('should return user data for valid token', async () => {
            const mockUser = { id: 'user-123', email: 'test@example.com' };
            const mockProfile = { id: 'user-123', full_name: 'Test User' };

            mockSupabaseClient.auth.getUser.mockResolvedValue({
                data: { user: mockUser },
                error: null
            });

            mockSupabaseAdmin.from.mockImplementation((table) => ({
                select: jest.fn().mockReturnThis(),
                eq: jest.fn().mockReturnThis(),
                in: jest.fn().mockReturnThis(),
                filter: jest.fn().mockReturnThis(),
                single: jest.fn().mockResolvedValue({
                    data: table === 'profiles' ? mockProfile : null,
                    error: null
                }),
                then: jest.fn((cb) => cb({ data: [], error: null })),
            }));

            const req = createMockReq({}, { authorization: 'Bearer valid-token' });
            const res = createMockRes();

            await authController.getMe(req, res);

            expect(res.status).toHaveBeenCalledWith(200);
            expect(res.json).toHaveBeenCalledWith(expect.objectContaining({
                user: expect.objectContaining({
                    id: 'user-123',
                    email: 'test@example.com'
                })
            }));
        });
    });

    describe('updatePassword', () => {
        it('should return 401 if no token provided', async () => {
            const req = createMockReq({ password: 'newpassword' }, {});
            const res = createMockRes();

            await authController.updatePassword(req, res);

            expect(res.status).toHaveBeenCalledWith(401);
            expect(res.json).toHaveBeenCalledWith({
                error: 'No token provided'
            });
        });

        it('should return 422 if new password is same as current', async () => {
            const mockUser = { id: 'user-123', email: 'test@example.com' };

            mockSupabaseClient.auth.getUser.mockResolvedValue({
                data: { user: mockUser },
                error: null
            });

            const req = createMockReq(
                { password: 'samepassword', currentPassword: 'samepassword' },
                { authorization: 'Bearer valid-token' }
            );
            const res = createMockRes();

            await authController.updatePassword(req, res);

            expect(res.status).toHaveBeenCalledWith(422);
            expect(res.json).toHaveBeenCalledWith(expect.objectContaining({
                error: expect.stringContaining('different')
            }));
        });
    });
});
