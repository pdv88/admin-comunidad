import React from 'react';
import { render, screen, fireEvent, waitFor, within } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import Voting from '../../pages/Voting';
import { MemoryRouter } from 'react-router-dom';

// Mocks
vi.mock('../../components/DashboardLayout', () => ({
    default: ({ children }) => <div data-testid="dashboard-layout">{children}</div>
}));
vi.mock('../../components/GlassLoader', () => ({
    default: () => <div data-testid="glass-loader">Loading...</div>
}));
vi.mock('../../components/ModalPortal', () => ({
    default: ({ children }) => <div data-testid="modal-portal">{children}</div>
}));
vi.mock('../../components/HierarchicalBlockSelector', () => ({
    default: () => <div data-testid="block-selector">Block Selector</div>
}));

// Auth Mock
const mockUser = { id: 1, email: 'user@example.com', full_name: 'Test User' };
const authContextMock = {
    user: mockUser,
    activeCommunity: { id: 1 },
    hasAnyRole: () => false,
    getPrimaryRole: () => 'resident',
    loading: false
};

vi.mock('../../context/AuthContext', () => ({
    useAuth: () => authContextMock
}));

vi.mock('react-i18next', () => ({
    useTranslation: () => ({
        t: (key) => key,
        i18n: { language: 'en' }
    }),
}));

const renderVoting = () => {
    return render(
        <MemoryRouter>
            <Voting />
        </MemoryRouter>
    );
};

describe('Voting Page', () => {
    beforeEach(() => {
        vi.clearAllMocks();
        // Default fetch mock
        global.fetch = vi.fn((url, options) => {
            // GET /api/polls
            if (url.includes('/api/polls') && (!options || options.method === 'GET')) {
                return Promise.resolve({
                    ok: true,
                    json: () => Promise.resolve([])
                });
            }
            // GET /api/properties/blocks
            if (url.includes('/api/properties/blocks')) {
                return Promise.resolve({
                    ok: true,
                    json: () => Promise.resolve([])
                });
            }
            // POST /api/polls
            if (url.includes('/api/polls') && options && options.method === 'POST') {
                return Promise.resolve({
                    ok: true,
                    json: () => Promise.resolve({ success: true })
                });
            }
            return Promise.resolve({ ok: false });
        });
    });

    afterEach(() => {
        vi.restoreAllMocks();
    });

    it('renders loading state initially', () => {
        renderVoting();
        expect(screen.getByTestId('glass-loader')).toBeInTheDocument();
    });

    it('renders active polls list', async () => {
        const polls = [
            {
                id: 1,
                title: 'New Gym Equipment',
                description: 'Should we buy a treadmill?',
                ends_at: '2030-12-31',
                poll_options: [
                    { id: 1, option_text: 'Yes' },
                    { id: 2, option_text: 'No' }
                ],
                results: [],
                total_votes: 0,
                user_voted: null
            }
        ];

        global.fetch.mockImplementation((url) => {
            if (url.includes('/api/polls')) return Promise.resolve({ ok: true, json: () => Promise.resolve(polls) });
            if (url.includes('/api/properties/blocks')) return Promise.resolve({ ok: true, json: () => Promise.resolve([]) });
            return Promise.resolve({ ok: false });
        });

        renderVoting();

        await waitFor(() => expect(screen.queryByTestId('glass-loader')).not.toBeInTheDocument());

        expect(screen.getByText('voting.title')).toBeInTheDocument();
        expect(screen.getByText('New Gym Equipment')).toBeInTheDocument();
        expect(screen.getByText('Should we buy a treadmill?')).toBeInTheDocument();
        expect(screen.getByText('Yes')).toBeInTheDocument();
        expect(screen.getByText('No')).toBeInTheDocument();
    });

    it('allows a user to vote', async () => {
        const polls = [
            {
                id: 1,
                title: 'Vote Test',
                description: 'Desc',
                ends_at: '2030-12-31',
                poll_options: [{ id: 1, option_text: 'Option A' }],
                results: [],
                total_votes: 0,
                user_voted: null
            }
        ];

        global.fetch.mockImplementation((url, options) => {
            if (url.includes('/api/polls/vote') && options?.method === 'POST') {
                return Promise.resolve({ ok: true, json: () => Promise.resolve({ success: true }) });
            }
            if (url.includes('/api/polls')) return Promise.resolve({ ok: true, json: () => Promise.resolve(polls) });
            return Promise.resolve({ ok: true, json: () => Promise.resolve([]) });
        });

        renderVoting();
        await waitFor(() => expect(screen.queryByTestId('glass-loader')).not.toBeInTheDocument());

        const optionBtn = screen.getByText('Option A').closest('button');
        fireEvent.click(optionBtn);

        await waitFor(() => {
            expect(global.fetch).toHaveBeenCalledWith(
                expect.stringContaining('/api/polls/vote'),
                expect.objectContaining({ method: 'POST' })
            );
        });
    });

    it('shows create button for admin', async () => {
        authContextMock.hasAnyRole = (roles) => roles.includes('admin');
        renderVoting();
        await waitFor(() => expect(screen.queryByTestId('glass-loader')).not.toBeInTheDocument());
        expect(screen.getByText('voting.create_poll')).toBeInTheDocument();
    });

    it('opens create modal and inputs poll details', async () => {
        authContextMock.hasAnyRole = (roles) => roles.includes('admin');

        global.fetch.mockImplementation((url, options) => {
            if (url.includes('/api/polls') && options?.method === 'POST') {
                return Promise.resolve({ ok: true, json: () => Promise.resolve({ success: true }) });
            }
            // For get polls/blocks
            return Promise.resolve({ ok: true, json: () => Promise.resolve([]) });
        });

        renderVoting();
        await waitFor(() => expect(screen.queryByTestId('glass-loader')).not.toBeInTheDocument());

        fireEvent.click(screen.getByText('voting.create_poll'));

        await waitFor(() => expect(screen.getByLabelText('voting.poll_title')).toBeInTheDocument());

        fireEvent.change(screen.getByLabelText('voting.poll_title'), { target: { value: 'New P' } });
        fireEvent.change(screen.getByLabelText('voting.poll_desc'), { target: { value: 'Desc' } });
        fireEvent.change(screen.getByLabelText('voting.deadline'), { target: { value: '2030-12-31' } });

        // Add option logic
        fireEvent.click(screen.getByText('+ voting.add_option'));
        fireEvent.change(screen.getByLabelText('voting.option 3'), { target: { value: 'Option C' } });

        // Save
        const submitButtons = screen.getAllByRole('button', { name: 'voting.create_poll' });
        const submitBtn = submitButtons[submitButtons.length - 1]; // The last one is the submit button in the modal
        fireEvent.click(submitBtn);

        await waitFor(() => expect(screen.queryByLabelText('voting.poll_title')).not.toBeInTheDocument());

        expect(global.fetch).toHaveBeenCalledWith(
            expect.stringContaining('/api/polls'),
            expect.objectContaining({ method: 'POST' })
        );
    });
});
