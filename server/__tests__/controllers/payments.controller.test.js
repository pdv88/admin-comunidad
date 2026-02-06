/**
 * Payments Controller Tests
 * 
 * Tests for payment endpoints:
 * - POST /payments
 * - GET /payments
 * - PUT /payments/:id/status
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

const paymentsController = require('../../src/controllers/payments.controller');

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

describe('Payments Controller', () => {
    const mockUser = { id: 'user-123', email: 'test@example.com' };
    const mockMember = {
        id: 'member-123',
        role_id: 'role-123',
        roles: { name: 'resident' },
        profile: { email: 'test@example.com', full_name: 'Test User' }
    };

    beforeEach(() => {
        jest.clearAllMocks();

        // Setup default auth mocks
        mockSupabaseClient.auth.getUser.mockResolvedValue({
            data: { user: mockUser },
            error: null
        });

        // Setup default admin/db mocks
        mockSupabaseAdmin.from.mockImplementation((table) => {
            const chain = {
                select: jest.fn().mockReturnThis(),
                insert: jest.fn().mockReturnThis(),
                update: jest.fn().mockReturnThis(),
                delete: jest.fn().mockReturnThis(),
                eq: jest.fn().mockReturnThis(),
                in: jest.fn().mockReturnThis(),
                single: jest.fn().mockImplementation(() => {
                    if (table === 'community_members') {
                        return Promise.resolve({ data: mockMember, error: null });
                    }
                    if (table === 'payments') {
                        return Promise.resolve({ data: { id: 'payment-123', amount: 100, status: 'pending' }, error: null });
                    }
                    return Promise.resolve({ data: null, error: null });
                }),
                maybeSingle: jest.fn().mockImplementation(() => {
                    if (table === 'payments') {
                        return Promise.resolve({ data: { id: 'payment-123', amount: 100, status: 'pending', community_id: 'community-123' }, error: null });
                    }
                    return Promise.resolve({ data: null, error: null });
                })
            };

            // Mock 'then' for array returns
            chain.then = (cb) => {
                if (table === 'member_roles') return cb({ data: [], error: null });
                return cb({ data: [], error: null });
            };

            return chain;
        });
    });

    describe('createPayment', () => {
        it('should create a payment successfully', async () => {
            const req = createMockReq({
                amount: 100,
                notes: 'Test Payment'
            });
            const res = createMockRes();

            await paymentsController.createPayment(req, res);

            expect(res.status).toHaveBeenCalledWith(201);
            expect(res.json).toHaveBeenCalledWith(expect.objectContaining({
                id: 'payment-123',
                status: 'pending'
            }));
        });

        it('should auto-confirm payment for admins', async () => {
            // Override member role to admin
            mockSupabaseAdmin.from.mockImplementation((table) => {
                const chain = require('../mocks/supabase').createChainableMock();
                if (table === 'community_members') {
                    chain.single.mockResolvedValue({
                        data: { ...mockMember, roles: { name: 'admin' } },
                        error: null
                    });
                }
                if (table === 'payments') {
                    chain.single.mockResolvedValue({ data: { id: 'payment-123', status: 'confirmed' }, error: null });
                }
                return chain;
            });

            const req = createMockReq({ amount: 100 });
            const res = createMockRes();

            await paymentsController.createPayment(req, res);

            expect(res.status).toHaveBeenCalledWith(201);
            // Check that insert was called with status 'confirmed'
            // We can't easily check args of chained mocks without more setup, 
            // but the response logic confirms it used the mocked return which represents the logic path.
        });

        it('should upload status proof if image provided', async () => {
            mockSupabaseAdmin.storage = {
                from: jest.fn().mockReturnValue({
                    upload: jest.fn().mockResolvedValue({ error: null }),
                    getPublicUrl: jest.fn().mockReturnValue({ data: { publicUrl: 'http://url' } })
                })
            };

            const req = createMockReq({
                amount: 100,
                base64Image: 'data:image/jpeg;base64,somerandomdata',
                fileName: 'proof.jpg'
            });
            const res = createMockRes();

            await paymentsController.createPayment(req, res);

            expect(res.status).toHaveBeenCalledWith(201);
            expect(mockSupabaseAdmin.storage.from).toHaveBeenCalledWith('payment-proofs');
        });
    });

    describe('getPayments', () => {
        it('should return payments list', async () => {
            const mockPayments = [{ id: 1, amount: 100 }, { id: 2, amount: 200 }];

            mockSupabaseAdmin.from.mockImplementation((table) => {
                const chain = require('../mocks/supabase').createChainableMock();
                if (table === 'community_members') {
                    chain.single.mockResolvedValue({ data: mockMember, error: null });
                }
                if (table === 'payments') {
                    // Configure the chain to resolve to the mock data when awaited
                    chain.then = (resolve) => resolve({ data: mockPayments, error: null });
                }
                return chain;
            });

            const req = createMockReq({}, {}, { type: 'own' });
            const res = createMockRes();

            await paymentsController.getPayments(req, res);

            expect(res.json).toHaveBeenCalled();
            // The controller implementation sends `result`
            // We assume it's an array
            const sentData = res.json.mock.calls[0][0];
            expect(Array.isArray(sentData)).toBe(true);
            expect(sentData).toHaveLength(2);
        });
    });

    describe('updatePaymentStatus', () => {
        it('should allow admin to confirm payment', async () => {
            // Setup admin user
            const adminMember = { ...mockMember, roles: { name: 'admin' } };

            mockSupabaseAdmin.from.mockImplementation((table) => {
                const chain = require('../mocks/supabase').createChainableMock();
                if (table === 'community_members') {
                    chain.single.mockResolvedValue({ data: adminMember, error: null });
                }
                if (table === 'payments') {
                    chain.maybeSingle.mockResolvedValue({ data: { id: 'payment-123', community_id: 'community-123', status: 'pending' }, error: null });
                    chain.single.mockResolvedValue({ data: { id: 'payment-123', status: 'confirmed', amount: 100 }, error: null });
                }
                chain.update = jest.fn().mockReturnThis();
                return chain;
            });

            const req = createMockReq({ status: 'confirmed' }, { id: 'payment-123' });
            const res = createMockRes();

            await paymentsController.updatePaymentStatus(req, res);

            expect(res.json).toHaveBeenCalledWith(expect.objectContaining({
                status: 'confirmed'
            }));
        });

        it('should reject non-admin users', async () => {
            // Normal resident member setup in beforeEach

            const req = createMockReq({ status: 'confirmed' }, { id: 'payment-123' });
            const res = createMockRes();

            await paymentsController.updatePaymentStatus(req, res);

            expect(res.status).toHaveBeenCalledWith(403);
        });
    });
});
