/**
 * Communities Controller Tests
 * 
 * Tests for community management:
 * - Public Info (Leaders aggregation)
 * - Settings (Update RBAC, Logo)
 * - Documents (Upload, Delete)
 */

const { createMockSupabaseClient } = require('../mocks/supabase');

// Mock external dependencies
jest.mock('../../src/config/supabaseClient', () => require('../mocks/supabase').createMockSupabaseClient());
jest.mock('../../src/config/supabaseAdmin', () => require('../mocks/supabase').createMockSupabaseClient());

const communitiesController = require('../../src/controllers/communities.controller');
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

describe('Communities Controller', () => {
    const mockUser = { id: 'user-123', email: 'resident@example.com' };
    const mockMember = {
        id: 'member-123',
        profile_id: 'user-123',
        roles: { name: 'admin' }, // Default to admin for most tests
        member_roles: []
    };

    beforeEach(() => {
        jest.clearAllMocks();
        mockSupabaseClient.auth.getUser.mockResolvedValue({ data: { user: mockUser }, error: null });

        // Default Admin Mock Setup
        mockSupabaseAdmin.from.mockImplementation((table) => {
            const chain = require('../mocks/supabase').createChainableMock();
            if (table === 'community_members') {
                chain.maybeSingle.mockResolvedValue({ data: mockMember, error: null });
                chain.single.mockResolvedValue({ data: mockMember, error: null });
            }
            if (table === 'communities') {
                chain.single.mockResolvedValue({ data: { id: 'community-123', name: 'Test Comm' }, error: null });
                chain.update.mockReturnValue({
                    select: jest.fn().mockReturnValue({
                        then: (cb) => cb({ data: [{ id: 'community-123', name: 'Updated Comm' }], error: null })
                    })
                });
            }
            return chain;
        });

        // Mock Storage defaults
        mockSupabaseAdmin.storage.listBuckets.mockResolvedValue({ data: [{ name: 'community-assets' }, { name: 'community-documents' }], error: null });
    });

    describe('getPublicInfo', () => {
        it('should aggregate leaders correctly', async () => {
            const req = createMockReq();
            const res = createMockRes();

            mockSupabaseAdmin.from.mockImplementation((table) => {
                const chain = require('../mocks/supabase').createChainableMock();
                if (table === 'community_members') chain.single.mockResolvedValue({ data: mockMember, error: null });
                if (table === 'communities') chain.single.mockResolvedValue({ data: { name: 'Test Comm' }, error: null });

                if (table === 'member_roles') {
                    // Mock Leaders Data
                    const leadersData = [
                        {
                            roles: { name: 'president' },
                            community_members: { profile: { full_name: 'Alice', email: 'alice@example.com', phone: '111' } }
                        },
                        {
                            roles: { name: 'vocal' },
                            block_id: 'block-1',
                            blocks: { name: 'Block A' },
                            community_members: { profile: { full_name: 'Bob', email: 'bob@example.com', phone: '222' } }
                        },
                        {
                            roles: { name: 'secretary' },
                            community_members: { profile: { full_name: 'Alice', email: 'alice@example.com', phone: '111' } } // Alice again (dual role)
                        }
                    ];
                    chain.in = jest.fn().mockResolvedValue({ data: leadersData, error: null });
                }

                return chain;
            });

            await communitiesController.getPublicInfo(req, res);

            const responseData = res.json.mock.calls[0][0];
            const leaders = responseData.leaders;

            // Alice should appear ONCE with 2 roles
            const alice = leaders.find(l => l.email === 'alice@example.com');
            expect(alice).toBeDefined();
            expect(alice.roles).toHaveLength(2);
            expect(alice.roles).toEqual([{ role: 'president' }, { role: 'secretary' }]);

            // Bob should have vocal role with block
            const bob = leaders.find(l => l.email === 'bob@example.com');
            expect(bob.roles[0]).toEqual({ role: 'vocal', block: 'Block A' });
        });
    });

    describe('updateCommunity', () => {
        it('should allow president to update details', async () => {
            const req = createMockReq({ name: 'New Name' });
            const res = createMockRes();

            // Mock President
            mockSupabaseAdmin.from.mockImplementation((table) => {
                const chain = require('../mocks/supabase').createChainableMock();
                if (table === 'community_members') {
                    chain.single.mockResolvedValue({
                        data: { ...mockMember, roles: { name: 'president' } },
                        error: null
                    });
                }
                if (table === 'communities') {
                    chain.update = jest.fn().mockReturnThis();
                    chain.eq = jest.fn().mockReturnThis();
                    chain.select = jest.fn().mockReturnValue({
                        then: (cb) => cb({ data: [{ name: 'New Name' }], error: null })
                    });
                }
                return chain;
            });

            await communitiesController.updateCommunity(req, res);
            expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ name: 'New Name' }));
        });

        it('should block non-admin', async () => {
            const req = createMockReq({ name: 'New Name' });
            const res = createMockRes();

            // Mock Resident
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

            await communitiesController.updateCommunity(req, res);
            expect(res.status).toHaveBeenCalledWith(403);
        });
    });

    describe('uploadDocument', () => {
        it('should upload file to storage and db', async () => {
            const req = createMockReq({
                name: 'Rules.pdf',
                base64File: 'data:application/pdf;base64,ZHVtbXk='
            });
            const res = createMockRes();

            mockSupabaseAdmin.storage.from.mockReturnValue({
                upload: jest.fn().mockResolvedValue({ data: { path: 'path/to/file' }, error: null }),
                getPublicUrl: jest.fn().mockReturnValue({ data: { publicUrl: 'http://test.com' } }),
                remove: jest.fn().mockResolvedValue({ data: [], error: null })
            });

            mockSupabaseAdmin.from.mockImplementation((table) => {
                const chain = require('../mocks/supabase').createChainableMock();
                if (table === 'community_members') {
                    chain.maybeSingle.mockResolvedValue({
                        data: { ...mockMember, roles: { name: 'admin' } },
                        error: null
                    });
                }
                if (table === 'community_documents') {
                    chain.insert = jest.fn().mockReturnValue({
                        select: jest.fn().mockReturnValue({
                            single: jest.fn().mockResolvedValue({ data: { id: 'doc-1', url: 'http://test.com' }, error: null })
                        })
                    });
                }
                return chain;
            });

            await communitiesController.uploadDocument(req, res);

            // Check storage called
            expect(mockSupabaseAdmin.storage.from).toHaveBeenCalledWith('community-documents');
            // Check DB insert
            expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ id: 'doc-1' }));
        });
    });
});
