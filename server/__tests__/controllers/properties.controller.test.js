/**
 * Properties Controller Tests
 * 
 * Tests for properties endpoints:
 * - GET /blocks
 * - POST /units
 */

const { createMockSupabaseClient } = require('../mocks/supabase');

// Mock external dependencies
jest.mock('../../src/config/supabaseClient', () => {
    return require('../mocks/supabase').createMockSupabaseClient();
});

jest.mock('../../src/config/supabaseAdmin', () => {
    return require('../mocks/supabase').createMockSupabaseClient();
});

const propertiesController = require('../../src/controllers/properties.controller');

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

describe('Properties Controller', () => {
    const mockUser = { id: 'user-123', email: 'test@example.com' };
    const mockMember = {
        id: 'member-123',
        profile_id: 'user-123',
        roles: { name: 'admin' },
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
            const chain = require('../mocks/supabase').createChainableMock();

            if (table === 'community_members') {
                chain.single.mockResolvedValue({ data: mockMember, error: null });
            }

            if (table === 'member_roles') {
                chain.select.mockReturnThis();
                chain.then = (cb) => cb({ data: [{ roles: { name: 'admin' } }], error: null });
            }

            chain.then = (cb) => cb({ data: [], error: null });
            return chain;
        });
    });

    describe('getAllBlocks', () => {
        it('should return blocks list', async () => {
            const mockBlocks = [{ id: 1, name: 'Block A' }];

            mockSupabaseClient.from.mockImplementation((table) => {
                const chain = require('../mocks/supabase').createChainableMock();
                if (table === 'blocks') {
                    chain.then = (cb) => cb({ data: mockBlocks, error: null });
                }
                return chain;
            });

            const req = createMockReq();
            const res = createMockRes();

            await propertiesController.getAllBlocks(req, res);

            expect(res.json).toHaveBeenCalledWith(expect.arrayContaining([
                expect.objectContaining({ name: 'Block A' })
            ]));
        });
    });

    describe('createUnit', () => {
        it('should create unit successfully', async () => {
            const req = createMockReq({
                block_id: 'block-123',
                unit_number: '1A'
            });
            const res = createMockRes();

            mockSupabaseAdmin.from.mockImplementation((table) => {
                const chain = require('../mocks/supabase').createChainableMock();

                if (table === 'community_members') {
                    chain.single.mockResolvedValue({ data: mockMember, error: null });
                }
                if (table === 'member_roles') {
                    // Mock permission check
                    chain.then = (cb) => cb({ data: [{ roles: { name: 'admin' } }], error: null });
                }
                if (table === 'blocks') {
                    // Validate block belongs to community
                    chain.single.mockResolvedValue({ data: { id: 'block-123', community_id: 'community-123' }, error: null });
                }
                if (table === 'units') {
                    // Default: "check existing" query (select -> eq -> ilike ...)
                    chain.maybeSingle.mockResolvedValue({ data: null, error: null });

                    // Capture insert for the creation query
                    chain.insert = jest.fn((data) => {
                        // When insert is called, configure the subsequent select() to return the new unit
                        chain.select = jest.fn().mockReturnValue({
                            then: (cb) => cb({ data: [{ id: 'unit-new', ...data[0] }], error: null })
                        });
                        return chain;
                    });
                }
                return chain;
            });

            await propertiesController.createUnit(req, res);

            expect(res.status).toHaveBeenCalledWith(201);
            expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ id: 'unit-new' }));
        });
    });
});
