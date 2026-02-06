import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import CommunitySettings from '../../pages/CommunitySettings';
import { MemoryRouter } from 'react-router-dom';

// Mocks
vi.mock('../../components/DashboardLayout', () => ({
    default: ({ children }) => <div data-testid="dashboard-layout">{children}</div>
}));
vi.mock('../../components/GlassLoader', () => ({
    default: () => <div data-testid="glass-loader">Loading...</div>
}));
vi.mock('../../components/ConfirmationModal', () => ({
    default: ({ isOpen, onConfirm }) => isOpen ? (
        <div data-testid="confirmation-modal">
            <button onClick={onConfirm}>Confirm</button>
        </div>
    ) : null
}));
vi.mock('../../components/Toast', () => ({
    default: ({ message }) => message ? <div>Toast: {message}</div> : null
}));

vi.mock('react-i18next', () => ({
    useTranslation: () => ({
        t: (key) => key,
    }),
}));

const mockUser = { id: 1, email: 'admin@example.com' };
const authContextMock = {
    user: mockUser,
    activeCommunity: { id: 1, community_id: 100 },
    hasAnyRole: (roles) => true, // Default Admin
    deleteCommunity: vi.fn(),
    refreshActiveCommunity: vi.fn()
};

vi.mock('../../context/AuthContext', () => ({
    useAuth: () => authContextMock
}));

describe('CommunitySettings Page', () => {
    beforeEach(() => {
        vi.clearAllMocks();
        vi.spyOn(Storage.prototype, 'getItem').mockReturnValue('fake-token');

        global.fetch = vi.fn((url, options) => {
            const method = options?.method || 'GET';

            // GET /api/communities/my
            if (url.includes('/api/communities/my') && method === 'GET') {
                return Promise.resolve({
                    ok: true,
                    json: () => Promise.resolve({
                        id: 100,
                        name: 'My Community',
                        address: '123 Test St',
                        bank_details: [],
                        documents: []
                    })
                });
            }

            // PUT /api/communities/update
            if (url.includes('/api/communities/update') && method === 'PUT') {
                return Promise.resolve({
                    ok: true,
                    json: () => Promise.resolve({ success: true, name: JSON.parse(options.body).name })
                });
            }

            return Promise.resolve({ ok: false });
        });

        // Mock FileReader
        global.FileReader = class {
            readAsDataURL() { this.onload({ target: { result: 'base64data' } }); }
        };
    });

    afterEach(() => {
        vi.restoreAllMocks();
    });

    it('renders settings form', async () => {
        render(
            <MemoryRouter>
                <CommunitySettings />
            </MemoryRouter>
        );

        await waitFor(() => expect(screen.queryByTestId('glass-loader')).not.toBeInTheDocument());

        expect(screen.getByText('community_settings.title')).toBeInTheDocument();
        expect(screen.getByDisplayValue('My Community')).toBeInTheDocument();
        expect(screen.getByDisplayValue('123 Test St')).toBeInTheDocument();
        expect(screen.getByText('community_settings.save')).toBeInTheDocument();
    });

    it('updates community name', async () => {
        render(
            <MemoryRouter>
                <CommunitySettings />
            </MemoryRouter>
        );

        await waitFor(() => expect(screen.queryByTestId('glass-loader')).not.toBeInTheDocument());

        const nameInput = screen.getByDisplayValue('My Community');
        fireEvent.change(nameInput, { target: { value: 'New Name' } });

        const saveBtn = screen.getByText('community_settings.save');
        fireEvent.click(saveBtn);

        await waitFor(() => {
            expect(global.fetch).toHaveBeenCalledWith(
                expect.stringContaining('/api/communities/update'),
                expect.objectContaining({
                    method: 'PUT',
                    body: expect.stringContaining('New Name')
                })
            );
        });

        expect(screen.getByText('Toast: community_settings.success')).toBeInTheDocument();
    });

    it('adds a bank account', async () => {
        render(
            <MemoryRouter>
                <CommunitySettings />
            </MemoryRouter>
        );

        await waitFor(() => expect(screen.queryByTestId('glass-loader')).not.toBeInTheDocument());

        fireEvent.click(screen.getByText('community_settings.add_account'));

        expect(screen.getByPlaceholderText('community_settings.placeholders.bank_name')).toBeInTheDocument();
    });

    it('shows view-only message for non-admins', async () => {
        authContextMock.hasAnyRole = () => false; // Resident

        render(
            <MemoryRouter>
                <CommunitySettings />
            </MemoryRouter>
        );

        await waitFor(() => expect(screen.queryByTestId('glass-loader')).not.toBeInTheDocument());

        expect(screen.getByText('community_settings.view_only')).toBeInTheDocument();
        expect(screen.queryByText('community_settings.save')).not.toBeInTheDocument();

        // Reset role
        authContextMock.hasAnyRole = () => true;
    });
});
