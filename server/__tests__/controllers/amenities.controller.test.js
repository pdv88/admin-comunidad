/**
 * Amenities Controller Tests
 * 
 * Tests for amenities and reservations:
 * - Managed Amenities (CRUD)
 * - Reservations (Complex validation logic)
 */

const { createMockSupabaseClient } = require('../mocks/supabase');

// Mock external dependencies
jest.mock('../../src/config/supabaseClient', () => {
    return require('../mocks/supabase').createMockSupabaseClient();
});

jest.mock('../../src/config/supabaseAdmin', () => {
    return require('../mocks/supabase').createMockSupabaseClient();
});

// Mock email utility
jest.mock('../../src/utils/sendEmail', () => jest.fn().mockResolvedValue(true));

const amenitiesController = require('../../src/controllers/amenities.controller');

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
    res.send = jest.fn().mockReturnValue(res);
    return res;
};

describe('Amenities Controller', () => {
    const mockUser = { id: 'user-123', email: 'resident@example.com' };
    const mockMember = { id: 'member-123', profile_id: 'user-123' };

    // Sample Amenity with limits
    const mockAmenity = {
        id: 'pool-1',
        name: 'Swimming Pool',
        community_id: 'community-123',
        is_reservable: true,
        reservation_limits: {
            allowed_days: [0, 1, 2, 3, 4, 5, 6], // All days
            schedule_start: '08:00',
            schedule_end: '20:00',
            max_days_per_month: 4,
            max_hours_per_day: 2
        }
    };

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
                chain.then = (cb) => cb({ data: [{ roles: { name: 'resident' } }], error: null });
            }

            if (!['community_members', 'member_roles'].includes(table)) {
                // Return empty by default
                chain.then = (cb) => cb({ data: [], error: null });
            }
            return chain;
        });
    });

    describe('Managed Amenities (CRUD)', () => {
        it('should allow admin to create amenity', async () => {
            const req = createMockReq({
                name: 'Gym',
                is_reservable: true
            });
            const res = createMockRes();

            mockSupabaseAdmin.from.mockImplementation((table) => {
                const chain = require('../mocks/supabase').createChainableMock();
                if (table === 'community_members') chain.single.mockResolvedValue({ data: mockMember, error: null });
                if (table === 'member_roles') {
                    chain.select = jest.fn().mockReturnThis();
                    chain.eq = jest.fn().mockReturnThis();
                    chain.then = (cb) => cb({ data: [{ roles: { name: 'admin' } }], error: null });
                }
                if (table === 'amenities') {
                    chain.insert = jest.fn().mockReturnValue({
                        select: jest.fn().mockReturnValue({
                            then: (cb) => cb({ data: [{ id: 'gym-1' }], error: null })
                        })
                    });
                }
                return chain;
            });

            await amenitiesController.createAmenity(req, res);
            expect(res.status).toHaveBeenCalledWith(201);
            expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ id: 'gym-1' }));
        });

        it('should block non-admin from creating amenity', async () => {
            const req = createMockReq({ name: 'Gym' });
            const res = createMockRes();
            // Default mock is resident
            await amenitiesController.createAmenity(req, res);
            expect(res.status).toHaveBeenCalledWith(403);
        });
    });

    describe('Reservations', () => {
        it('should create reservation successfully if valid', async () => {
            const req = createMockReq({
                amenity_id: 'pool-1',
                date: '2025-06-15', // a future date
                start_time: '10:00',
                end_time: '11:00'
            });
            const res = createMockRes();

            mockSupabaseAdmin.from.mockImplementation((table) => {
                const chain = require('../mocks/supabase').createChainableMock();

                if (table === 'community_members') chain.single.mockResolvedValue({ data: mockMember, error: null });
                if (table === 'member_roles') {
                    chain.select = jest.fn().mockReturnThis();
                    chain.eq = jest.fn().mockReturnThis();
                    chain.then = (cb) => cb({ data: [{ roles: { name: 'resident' } }], error: null });
                }

                if (table === 'amenities') {
                    chain.single.mockResolvedValue({ data: mockAmenity, error: null });
                }

                if (table === 'unit_owners') {
                    chain.single.mockResolvedValue({ data: { unit_id: 'unit-1' }, error: null });
                }

                // Overlaps check
                if (table === 'reservations') {
                    // Sequence of queries:
                    // 1. Overlaps check (expect empty)
                    // 2. Monthly limit check (expect count 0)
                    // 3. Daily limit check (expect empty list)

                    chain.then
                        .mockImplementationOnce((cb) => cb({ data: [], error: null })) // Overlaps
                        .mockImplementationOnce((cb) => cb({ count: 0, error: null })) // Monthly
                        .mockImplementationOnce((cb) => cb({ data: [], error: null })); // Daily

                    // 4. Insert (handled by insert method mock)
                    chain.insert = jest.fn().mockReturnValue({
                        select: jest.fn().mockReturnValue({
                            then: (cb) => cb({ data: [{ id: 'res-1', status: 'pending' }], error: null })
                        })
                    });

                    return chain;
                }

                return chain;
            });

            await amenitiesController.createReservation(req, res);

            expect(res.status).toHaveBeenCalledWith(201);
            expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ status: 'pending' }));
        });

        it('should prevent reservation outside schedule hours', async () => {
            const req = createMockReq({
                amenity_id: 'pool-1',
                date: '2025-06-15',
                start_time: '21:00', // Late night (pool closes 20:00)
                end_time: '22:00'
            });
            const res = createMockRes();

            mockSupabaseAdmin.from.mockImplementation((table) => {
                const chain = require('../mocks/supabase').createChainableMock();
                if (table === 'community_members') chain.single.mockResolvedValue({ data: mockMember, error: null });
                if (table === 'amenities') chain.single.mockResolvedValue({ data: mockAmenity, error: null });
                if (table === 'unit_owners') chain.single.mockResolvedValue({ data: { unit_id: 'unit-1' }, error: null });
                if (table === 'reservations') {
                    // Overlaps check (should pass)
                    chain.gt = jest.fn().mockReturnValue({ then: (cb) => cb({ data: [], error: null }) });
                }
                return chain;
            });

            await amenitiesController.createReservation(req, res);

            expect(res.status).toHaveBeenCalledWith(400);
            expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ error: expect.stringMatching(/must be within opening hours/) }));
        });

        it('should prevent reservation exceeding daily duration limit', async () => {
            // Max 2 hours per day. Requesting 3 hours.
            const req = createMockReq({
                amenity_id: 'pool-1',
                date: '2025-06-15',
                start_time: '10:00',
                end_time: '13:00'
            });
            const res = createMockRes();

            mockSupabaseAdmin.from.mockImplementation((table) => {
                const chain = require('../mocks/supabase').createChainableMock();
                if (table === 'community_members') chain.single.mockResolvedValue({ data: mockMember, error: null });
                if (table === 'amenities') chain.single.mockResolvedValue({ data: mockAmenity, error: null });
                if (table === 'unit_owners') chain.single.mockResolvedValue({ data: { unit_id: 'unit-1' }, error: null });

                if (table === 'reservations') {
                    // Sequence:
                    // 1. Overlaps (empty)
                    // 2. Monthly (count 0)
                    // 3. Daily (return existing reservation to calculate usage)
                    //    We want to simulate usage. But logic calculates: existing + requested > max.
                    //    Max: 2 hours. Requested: 3 hours.
                    //    So even if existing is empty (0 hours), 0 + 3 > 2. So it fails.
                    //    So return empty for daily check is fine.

                    chain.then
                        .mockImplementationOnce((cb) => cb({ data: [], error: null }))
                        .mockImplementationOnce((cb) => cb({ count: 0, error: null }))
                        .mockImplementationOnce((cb) => cb({ data: [], error: null }));

                    return chain;
                }
                return chain;
            });

            // To properly mock the specific calls, matching by method signature is tricky without spy.
            // But controller calls:
            // 1. Overlaps: .gt('end_time', start_time)
            // 2. Monthly: .select(..., {count: 'exact'}) ... .lte('date', endOfMonth)
            // 3. Daily: .select('start_time, end_time') ... .in('status', ...)

            // The previous test structure for limits (if/else) is fragile. 
            // Better to rely on the sequence or just assume we mock data returning empty for overlaps/monthly
            // but the DAILY logic calculates duration purely from inputs first? No.
            // Inputs: 3 hours. Max: 2. Existing: 0.
            // 3 > 2 -> Error.

            // So queries don't need to return data for this to fail.
            // BUT controller fetches `existing` reservations to SUM them up.

            await amenitiesController.createReservation(req, res);

            expect(res.status).toHaveBeenCalledWith(400);
            expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ error: expect.stringMatching(/Daily limit exceeded/) }));
        });

        it('should detect overlaps', async () => {
            const req = createMockReq({
                amenity_id: 'pool-1',
                date: '2025-06-15',
                start_time: '12:00',
                end_time: '13:00'
            });
            const res = createMockRes();

            mockSupabaseAdmin.from.mockImplementation((table) => {
                const chain = require('../mocks/supabase').createChainableMock();
                if (table === 'community_members') chain.single.mockResolvedValue({ data: mockMember, error: null });
                if (table === 'amenities') chain.single.mockResolvedValue({ data: mockAmenity, error: null });
                if (table === 'unit_owners') chain.single.mockResolvedValue({ data: { unit_id: 'unit-1' }, error: null });

                if (table === 'reservations') {
                    // Overlaps query returns a match!
                    chain.gt = jest.fn().mockReturnValue({
                        then: (cb) => cb({ data: [{ id: 'existing-res' }], error: null })
                    });
                }
                return chain;
            });

            await amenitiesController.createReservation(req, res);
            expect(res.status).toHaveBeenCalledWith(400);
            expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ error: 'Time slot already reserved or pending.' }));
        });
    });
});
