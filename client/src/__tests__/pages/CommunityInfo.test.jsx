import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import CommunityInfo from '../../pages/CommunityInfo';
import { MemoryRouter } from 'react-router-dom';

// Mocks
vi.mock('../../components/DashboardLayout', () => ({
    default: ({ children }) => <div data-testid="dashboard-layout">{children}</div>
}));
vi.mock('../../components/GlassLoader', () => ({
    default: () => <div data-testid="glass-loader">Loading...</div>
}));

vi.mock('react-i18next', () => ({
    useTranslation: () => ({
        t: (key) => key,
    }),
}));

const mocks = vi.hoisted(() => ({
    auth: {
        user: { id: 1 },
        activeCommunity: { id: 1, community_id: 100 },
    }
}));

vi.mock('../../context/AuthContext', () => ({
    useAuth: () => mocks.auth
}));

describe('CommunityInfo Page', () => {
    beforeEach(() => {
        vi.clearAllMocks();
        vi.spyOn(Storage.prototype, 'getItem').mockReturnValue('fake-token');

        global.fetch = vi.fn((url) => {
            if (url.includes('/api/communities/public-info')) {
                return Promise.resolve({
                    ok: true,
                    json: () => Promise.resolve({
                        community: {
                            name: 'Sunny Side',
                            address: '123 Sun St',
                            logo_url: 'logo.png',
                            bank_details: [{ bank_name: 'Bank One', account_number: '123456' }]
                        },
                        leaders: [
                            { name: 'Alice', roles: [{ role: 'president', block: 'Block A' }], email: 'alice@example.com' }
                        ],
                        amenities: [
                            { name: 'Pool', reservation_limits: { type: 'day', allowed_days: [0, 6], schedule_start: '09:00', schedule_end: '18:00' } }
                        ],
                        documents: [
                            { name: 'Rules.pdf', url: 'http://example.com/rules.pdf', created_at: '2023-01-01' }
                        ]
                    })
                });
            }
            return Promise.resolve({ ok: false });
        });
    });

    afterEach(() => {
        vi.restoreAllMocks();
    });

    it('renders loading state initially', () => {
        render(
            <MemoryRouter>
                <CommunityInfo />
            </MemoryRouter>
        );
        expect(screen.getByTestId('glass-loader')).toBeInTheDocument();
    });

    it('renders community info details', async () => {
        render(
            <MemoryRouter>
                <CommunityInfo />
            </MemoryRouter>
        );

        await waitFor(() => expect(screen.queryByTestId('glass-loader')).not.toBeInTheDocument());

        expect(screen.getByText('Sunny Side')).toBeInTheDocument();
        expect(screen.getByText('123 Sun St')).toBeInTheDocument();
    });

    it('handles error state', async () => {
        global.fetch.mockResolvedValueOnce({ ok: false });

        render(
            <MemoryRouter>
                <CommunityInfo />
            </MemoryRouter>
        );

        await waitFor(() => expect(screen.queryByTestId('glass-loader')).not.toBeInTheDocument());

        expect(screen.getByText('Failed to load information')).toBeInTheDocument();
    });
});
