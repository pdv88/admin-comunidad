
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

describe('Payments Controller - Create Campaign', () => {
    let req, res;

    beforeEach(() => {
        req = {
            headers: {
                authorization: 'Bearer token',
                'x-community-id': 'comm-123'
            },
            body: {
                name: 'Test Campaign',
                goal_amount: 1000,
                description: 'Test Desc',
                deadline: '2023-12-31',
                is_mandatory: true,
                // Scenario 1: Coefficient Method
                calculation_method: 'coefficient',
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

    it('should calculate fees based on re-normalized coefficients for a block', async () => {
        // Mock Auth & Membership
        mockSupabase.auth.getUser.mockResolvedValue({ data: { user: { id: 'admin-1' } }, error: null });
        mockSupabaseAdmin.from.mockImplementation((table) => {
            const chain = createChain();
            if (table === 'community_members') {
                chain.single.mockResolvedValue({
                    data: {
                        id: 1,
                        // allRoles: ['admin'], // This is overwritten by getUserAndMember logic
                        profile: { id: 'admin-1' }
                    },
                    error: null
                });
            } else if (table === 'member_roles') {
                // calls .select().eq() - mock the terminal call eq
                chain.eq.mockResolvedValue({
                    data: [{ roles: { name: 'admin' } }]
                });
            } else if (table === 'campaigns') {
                // insert().select().single()
                chain.single.mockResolvedValue({ data: { id: 'camp-1' }, error: null });
            } else if (table === 'units') {
                // .select().eq().in()
                chain.in.mockResolvedValue({
                    data: [
                        {
                            id: 'u1',
                            unit_number: '101',
                            coefficient: 10,
                            block_id: 'block-1',
                            blocks: { name: 'Block A' },
                            unit_owners: [{ is_primary: true, profile: { email: 'u1@test.com' } }]
                        },
                        {
                            id: 'u2',
                            unit_number: '102',
                            coefficient: 30,
                            block_id: 'block-1',
                            blocks: { name: 'Block A' },
                            unit_owners: [{ is_primary: true, profile: { email: 'u2@test.com' } }]
                        }
                    ],
                    error: null
                });
            } else if (table === 'blocks') {
                // .select().eq()
                chain.eq.mockResolvedValue({ data: [{ id: 'block-1', parent_id: null }] }); // descendant logic
            } else if (table === 'communities') {
                chain.single.mockResolvedValue({ data: { name: 'Comm' } });
            }
            chains.push({ table, chain });
            return chain;
        });

        await paymentsController.createCampaign(req, res);

        // Wait for async IIFE to complete
        await new Promise(resolve => setTimeout(resolve, 100));

        // Verify Insert into extraordinary_fees
        const insertChain = chains.find(c => c.table === 'extraordinary_fees')?.chain;
        if (!insertChain) {
            console.log("Chains captured:", chains.map(c => c.table));
            throw new Error("extraordinary_fees table was not accessed");
        }
        expect(insertChain.insert).toHaveBeenCalled();
        const insertedFees = insertChain.insert.mock.calls[0][0];

        expect(insertedFees).toHaveLength(2);

        const fee1 = insertedFees.find(f => f.unit_id === 'u1');
        const fee2 = insertedFees.find(f => f.unit_id === 'u2');

        // Allow some floating point tolerance
        expect(fee1.amount).toBeCloseTo(250, 2);
        expect(fee2.amount).toBeCloseTo(750, 2);
    });
});
