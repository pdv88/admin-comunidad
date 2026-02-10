
// Helper to create a fresh chain for each call
const createChain = () => {
    const chain = {
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        in: jest.fn().mockReturnThis(),
        single: jest.fn(),
        maybeSingle: jest.fn(),
        insert: jest.fn().mockReturnThis(),
        delete: jest.fn().mockReturnThis(),
        update: jest.fn().mockReturnThis(),
        order: jest.fn()
    };
    return chain;
};

// We need to track the chains created to inspect them later or config them
let chains = [];

const mockSupabaseAdmin = {
    from: jest.fn(() => {
        const c = createChain();
        chains.push(c);
        return c;
    }),
    storage: {
        listBuckets: jest.fn(),
        createBucket: jest.fn(),
        from: jest.fn(() => ({
            upload: jest.fn(),
            getPublicUrl: jest.fn()
        }))
    }
};

const mockSupabase = {
    auth: {
        getUser: jest.fn()
    }
};

jest.mock('../../src/config/supabaseClient', () => mockSupabase);
jest.mock('../../src/config/supabaseAdmin', () => mockSupabaseAdmin);

const communitiesController = require('../../src/controllers/communities.controller');

describe('Communities Controller - Get Public Info', () => {
    let req, res;

    beforeEach(() => {
        req = {
            headers: {
                authorization: 'Bearer token',
                'x-community-id': 'comm-123'
            }
        };
        res = {
            json: jest.fn(),
            status: jest.fn().mockReturnThis()
        };
        chains = []; // Reset chains
        jest.clearAllMocks();
    });

    it('should return legacy admins and security/maintenance roles', async () => {
        mockSupabase.auth.getUser.mockResolvedValue({ data: { user: { id: 'user-1' } }, error: null });

        mockSupabaseAdmin.from.mockImplementation((table) => {
            const chain = createChain();

            if (table === 'community_members') {
                chain.single.mockResolvedValue({ data: { id: 1 }, error: null });
                chain.in.mockResolvedValue({
                    data: [{ profile: { email: 'admin@test.com', full_name: 'Admin' }, roles: { name: 'admin' } }],
                    error: null
                });
            } else if (table === 'communities') {
                chain.single.mockResolvedValue({ data: { name: 'Test Comm' }, error: null });
            } else if (table === 'member_roles') {
                chain.in.mockResolvedValue({
                    data: [{
                        community_members: { profile: { email: 'sec@test.com', full_name: 'Security' } },
                        roles: { name: 'security' },
                        blocks: { name: 'Main Gate' }
                    }],
                    error: null
                });
            } else if (table === 'amenities') {
                chain.order.mockResolvedValue({ data: [], error: null });
            } else if (table === 'community_documents') {
                chain.order.mockResolvedValue({ data: [], error: null });
            }

            chains.push({ table, chain });
            return chain;
        });

        await communitiesController.getPublicInfo(req, res);

        const multiRoleChain = chains.find(c => c.table === 'member_roles').chain;
        expect(multiRoleChain.in).toHaveBeenCalled();
        const multiRoleArgs = multiRoleChain.in.mock.calls[0][1];

        expect(multiRoleArgs).toContain('security');
        expect(multiRoleArgs).toContain('maintenance');

        const legacyChain = chains.filter(c => c.table === 'community_members').find(c => c.chain.in.mock.calls.length > 0).chain;
        expect(legacyChain.in).toHaveBeenCalled();
        const legacyArgs = legacyChain.in.mock.calls[0][1];

        expect(legacyArgs).toContain('security');
        expect(legacyArgs).toContain('maintenance');

        expect(res.json).toHaveBeenCalledWith(expect.objectContaining({
            leaders: expect.arrayContaining([
                expect.objectContaining({ email: 'admin@test.com' }),
                expect.objectContaining({ email: 'sec@test.com' })
            ])
        }));
    });

    it('should NOT return neighbors (non-admins)', async () => {
        mockSupabase.auth.getUser.mockResolvedValue({ data: { user: { id: 'user-1' } }, error: null });

        mockSupabaseAdmin.from.mockImplementation((table) => {
            const chain = createChain();

            if (table === 'community_members') {
                chain.single.mockResolvedValue({ data: { id: 1 }, error: null });

                chain.in.mockResolvedValue({
                    data: [{
                        profile: { email: 'neighbor@test.com', full_name: 'Neighbor' },
                        roles: { name: 'neighbor' }
                    }],
                    error: null
                });
            } else if (table === 'communities') {
                chain.single.mockResolvedValue({ data: { name: 'Test Comm' }, error: null });
            } else if (table === 'member_roles') {
                chain.in.mockResolvedValue({ data: [], error: null });
            } else if (table === 'amenities') {
                chain.order.mockResolvedValue({ data: [], error: null });
            } else if (table === 'community_documents') {
                chain.order.mockResolvedValue({ data: [], error: null });
            }

            chains.push({ table, chain });
            return chain;
        });

        await communitiesController.getPublicInfo(req, res);

        const legacyChain = chains.filter(c => c.table === 'community_members').find(c => c.chain.in.mock.calls.length > 0).chain;

        const selectCall = legacyChain.select.mock.calls[0];
        const selectArg = selectCall[0];

        expect(selectArg).toContain('roles!inner(name)');
    });

    it('should sort leaders by priority: President > Admin > Treasurer > Maintenance > Security', async () => {
        mockSupabase.auth.getUser.mockResolvedValue({ data: { user: { id: 'user-1' } }, error: null });

        mockSupabaseAdmin.from.mockImplementation((table) => {
            const chain = createChain();

            if (table === 'community_members') {
                chain.single.mockResolvedValue({ data: { id: 1 }, error: null });
                // Return President (Legacy)
                chain.in.mockResolvedValue({
                    data: [{
                        profile: { email: 'pres@test.com', full_name: 'President' },
                        roles: { name: 'president' }
                    }],
                    error: null
                });
            } else if (table === 'communities') {
                chain.single.mockResolvedValue({ data: { name: 'Test Comm' }, error: null });
            } else if (table === 'member_roles') {
                // Return Security, Admin, Maintenance, Treasurer (Mixed order)
                chain.in.mockResolvedValue({
                    data: [
                        { community_members: { profile: { email: 'sec@test.com', full_name: 'Security' } }, roles: { name: 'security' } },
                        { community_members: { profile: { email: 'admin@test.com', full_name: 'Admin' } }, roles: { name: 'admin' } },
                        { community_members: { profile: { email: 'maint@test.com', full_name: 'Maintenance' } }, roles: { name: 'maintenance' } },
                        { community_members: { profile: { email: 'treas@test.com', full_name: 'Treasurer' } }, roles: { name: 'treasurer' } }
                    ],
                    error: null
                });
            } else if (table === 'amenities') {
                chain.order.mockResolvedValue({ data: [], error: null });
            } else if (table === 'community_documents') {
                chain.order.mockResolvedValue({ data: [], error: null });
            }

            chains.push({ table, chain });
            return chain;
        });

        await communitiesController.getPublicInfo(req, res);

        // Check the JSON response for sorted leaders
        const responseData = res.json.mock.calls[0][0];
        const leaders = responseData.leaders;

        // Expected Order: President, Admin, Treasurer, Maintenance, Security
        expect(leaders[0].roles[0].role).toBe('president');
        expect(leaders[1].roles[0].role).toBe('admin');
        expect(leaders[2].roles[0].role).toBe('treasurer');
        expect(leaders[3].roles[0].role).toBe('maintenance');
        expect(leaders[4].roles[0].role).toBe('security');
    });
});
