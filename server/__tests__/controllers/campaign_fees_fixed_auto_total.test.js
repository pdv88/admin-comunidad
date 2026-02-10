
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
        order: jest.fn().mockReturnThis(),
        range: jest.fn().mockReturnThis(),
        match: jest.fn().mockReturnThis()
    };
    return chain;
};

let chains = [];

const mockSupabaseAdmin = {
    from: jest.fn(() => {
        const c = createChain();
        chains.push(c);
        return c;
    }),
    auth: {
        admin: {
            getUserById: jest.fn()
        }
    },
    storage: {
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
jest.mock('../../src/utils/sendEmail', () => jest.fn());

const paymentsController = require('../../src/controllers/payments.controller');

describe('Payments Controller - Create Campaign (Fixed Auto-Total)', () => {
    let req, res;

    beforeEach(() => {
        req = {
            headers: {
                authorization: 'Bearer token',
                'x-community-id': 'comm-123'
            },
            body: {
                name: 'Fixed Campaign',
                goal_amount: 999999, // User provided WRONG total
                description: 'Test Desc',
                deadline: '2023-12-31',
                is_mandatory: true,
                calculation_method: 'fixed',
                amount_per_unit: 50, // 50 per unit
                target_type: 'blocks',
                target_blocks: ['block-1']
            }
        };
        res = {
            json: jest.fn(),
            status: jest.fn().mockReturnThis()
        };
        chains = [];
        jest.clearAllMocks();
    });

    it('should ignore user goal_amount and calculate total from units * amount_per_unit', async () => {
        // Mock Auth & Membership
        mockSupabase.auth.getUser.mockResolvedValue({ data: { user: { id: 'admin-1' } }, error: null });
        mockSupabaseAdmin.from.mockImplementation((table) => {
            const chain = createChain();
            if (table === 'community_members') {
                chain.single.mockResolvedValue({
                    data: {
                        id: 1,
                        // allRoles: ['admin'], 
                        profile: { id: 'admin-1' }
                    },
                    error: null
                });
            } else if (table === 'member_roles') {
                chain.eq.mockResolvedValue({
                    data: [{ roles: { name: 'admin' } }]
                });
            } else if (table === 'campaigns') {
                chain.single.mockResolvedValue({ data: { id: 'camp-1' }, error: null });
            } else if (table === 'units') {
                // Return 3 units
                // Total Should be 3 * 50 = 150
                chain.in.mockResolvedValue({
                    data: [
                        { id: 'u1', unit_number: '101', coefficient: 10, block_id: 'block-1', blocks: { name: 'Block A' }, unit_owners: [{ is_primary: true, profile: { email: 'u1@test.com' } }] },
                        { id: 'u2', unit_number: '102', coefficient: 10, block_id: 'block-1', blocks: { name: 'Block A' }, unit_owners: [{ is_primary: true, profile: { email: 'u2@test.com' } }] },
                        { id: 'u3', unit_number: '103', coefficient: 10, block_id: 'block-1', blocks: { name: 'Block A' }, unit_owners: [{ is_primary: true, profile: { email: 'u3@test.com' } }] }
                    ],
                    error: null
                });
            } else if (table === 'blocks') {
                chain.eq.mockResolvedValue({ data: [{ id: 'block-1', parent_id: null }] });
            } else if (table === 'communities') {
                chain.single.mockResolvedValue({ data: { name: 'Comm' } });
            }
            chains.push({ table, chain });
            return chain;
        });

        await paymentsController.createCampaign(req, res);

        // Check Update on campaigns table (or Insert)
        const insertChain = chains.find(c => c.table === 'campaigns').chain;
        expect(insertChain.insert).toHaveBeenCalled();
        const insertedCampaign = insertChain.insert.mock.calls[0][0];

        // Currently it uses goal_amount, so this will fail until I refactor
        expect(insertedCampaign.target_amount).toBe(150);
        expect(insertedCampaign.target_amount).not.toBe(999999);
    });
});
