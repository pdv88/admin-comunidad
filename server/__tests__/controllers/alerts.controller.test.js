/**
 * Alerts Controller Tests
 * 
 * Tests for system alerts:
 * - Admin-only access (GET, PATCH, DELETE)
 * - Permission denial for non-admins
 */

const { createMockSupabaseClient } = require('../mocks/supabase');

// Mock external dependencies
jest.mock('../../src/config/supabaseClient', () => require('../mocks/supabase').createMockSupabaseClient());
jest.mock('../../src/config/supabaseAdmin', () => require('../mocks/supabase').createMockSupabaseClient());

const alertsController = require('../../src/controllers/alerts.controller');
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

describe('Alerts Controller', () => {
    const mockUser = { id: 'user-123', email: 'admin@example.com' };
    const mockMember = { id: 'member-123', profile_id: 'user-123' };

    beforeEach(() => {
        jest.clearAllMocks();
        mockSupabaseClient.auth.getUser.mockResolvedValue({ data: { user: mockUser }, error: null });

        // Default Admin Mock
        mockSupabaseAdmin.from.mockImplementation((table) => {
            const chain = require('../mocks/supabase').createChainableMock();
            if (table === 'community_members') {
                // Return Admin role by default
                chain.single.mockResolvedValue({
                    data: { ...mockMember, roles: { name: 'admin' } },
                    error: null
                });
            }
            return chain;
        });
    });

    describe('getAlerts', () => {
        it('should list alerts for admin', async () => {
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
                if (table === 'system_alerts') {
                    chain.select = jest.fn().mockReturnThis();
                    chain.eq = jest.fn().mockReturnThis();
                    chain.order = jest.fn().mockReturnValue({
                        then: (cb) => cb({ data: [{ id: 1 }], error: null })
                    });
                }
                return chain;
            });

            await alertsController.getAlerts(req, res);
            expect(res.json).toHaveBeenCalledWith(expect.arrayContaining([{ id: 1 }]));
        });

        it('should block non-admin', async () => {
            const req = createMockReq();
            const res = createMockRes();

            mockSupabaseAdmin.from.mockImplementation((table) => {
                const chain = require('../mocks/supabase').createChainableMock();
                if (table === 'community_members') {
                    chain.single.mockResolvedValue({
                        data: { ...mockMember, roles: { name: 'resident' } },
                        error: null
                    });
                }
                return chain;
            });

            await alertsController.getAlerts(req, res);
            expect(res.status).toHaveBeenCalledWith(403);
        });
    });

    describe('markAsRead', () => {
        it('should update alert status', async () => {
            const req = createMockReq({}, { id: 1 });
            const res = createMockRes();

            mockSupabaseAdmin.from.mockImplementation((table) => {
                const chain = require('../mocks/supabase').createChainableMock();
                if (table === 'community_members') {
                    chain.single.mockResolvedValue({
                        data: { ...mockMember, roles: { name: 'admin' } },
                        error: null
                    });
                }
                if (table === 'system_alerts') {
                    chain.update = jest.fn().mockReturnThis();
                    chain.eq = jest.fn().mockReturnValue({
                        // Chained eq checks
                        eq: jest.fn().mockReturnValue({
                            then: (cb) => cb({ error: null })
                        })
                    });
                }
                return chain;
            });

            await alertsController.markAsRead(req, res);
            expect(res.json).toHaveBeenCalledWith({ message: 'Marked as read' });
        });
    });

    describe('deleteAlert', () => {
        it('should delete alert', async () => {
            const req = createMockReq({}, { id: 1 });
            const res = createMockRes();

            mockSupabaseAdmin.from.mockImplementation((table) => {
                const chain = require('../mocks/supabase').createChainableMock();
                if (table === 'community_members') {
                    chain.single.mockResolvedValue({
                        data: { ...mockMember, roles: { name: 'admin' } },
                        error: null
                    });
                }
                if (table === 'system_alerts') {
                    chain.delete = jest.fn().mockReturnThis();
                    chain.eq = jest.fn().mockReturnValue({
                        eq: jest.fn().mockReturnValue({
                            then: (cb) => cb({ error: null })
                        })
                    });
                }
                return chain;
            });

            await alertsController.deleteAlert(req, res);
            expect(res.json).toHaveBeenCalledWith({ message: 'Deleted' });
        });
    });
});
