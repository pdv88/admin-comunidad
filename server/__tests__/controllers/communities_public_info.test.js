
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

    it('should NOT return neighbors (non-admins)', async () => {
        // Mock Auth
        mockSupabase.auth.getUser.mockResolvedValue({ data: { user: { id: 'user-1' } }, error: null });

        // Mock DB Returns
        mockSupabaseAdmin.from.mockImplementation((table) => {
            const chain = createChain();

            if (table === 'community_members') {
                chain.single.mockResolvedValue({ data: { id: 1 }, error: null });

                // LEGACY QUERY RESPONSE
                // This simulates the BUG: The query returns a member who has a role 'neighbor', 
                // because the filter `in('roles.name', ...)` might not filter the row if it's a left join 
                // and the backend logic in the controller doesn't filter it out manually.
                // Or, if Supabase/PostgREST actually *does* filter it, then my hypothesis is wrong.
                // BUT, assume for the test that the DB returns a user with 'neighbor' because of the loose join.
                // Wait, if I mock the DB to return 'neighbor', I am forcing the bug behavior in the DB response.
                // The BUG is in the QUERY CONSTRUCTION (missing !inner).
                // So the test should assert that the query was constructed with `!inner`.

                chain.in.mockResolvedValue({
                    data: [{
                        profile: { email: 'neighbor@test.com', full_name: 'Neighbor' },
                        roles: { name: 'neighbor' } // The DB returns this if filtering failed or wasn't strict
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

        // Verify the Legacy Query used `!inner`
        // We find the chain for 'community_members' that called `in`
        const legacyChain = chains.filter(c => c.table === 'community_members').find(c => c.chain.in.mock.calls.length > 0).chain;

        // Assert the select() was called with `roles!inner(name)` NOT `roles(name)`
        const selectCall = legacyChain.select.mock.calls[0];
        const selectArg = selectCall[0];

        // With current code, this should be `roles(name)`, so we expect expectation to FAIL if we check properly.
        // Or we can check if the output contains the neighbor.
        // If the DB returns the neighbor (simulating the bug), the controller logic:
        /*
            if (roleName) {
                const leader = leadersMap.get(email);
                if (!leader.roles.some(r => r.role === roleName)) {
                    leader.roles.push({ role: roleName });
                }
            }
        */
        // It blindly adds whatever the DB returns.
        // So if the DB returns 'neighbor', it gets added.

        // So the robust test here is to check the QUERY STRUCTURE to ensure we are asking the DB strictly.
        expect(selectArg).toContain('roles!inner(name)');
    });
});
