import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import Notices from '../../pages/Notices';
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
vi.mock('../../components/ConfirmationModal', () => ({
    default: ({ isOpen, onConfirm }) => isOpen ? (
        <div data-testid="confirmation-modal">
            <button onClick={onConfirm}>Confirm Delete</button>
        </div>
    ) : null
}));
vi.mock('../../components/GlassSelect', () => ({
    default: ({ value, onChange, options, disabled }) => (
        <select data-testid="glass-select" value={value} onChange={onChange} disabled={disabled}>
            {options.map(opt => <option key={opt.value} value={opt.value}>{opt.label}</option>)}
        </select>
    )
}));
vi.mock('../../components/Toast', () => ({
    default: ({ message }) => message ? <div>Toast: {message}</div> : null
}));

// Mock Auth
const mockUser = { id: 1, email: 'admin@example.com' };
const authContextMock = {
    user: mockUser,
    activeCommunity: { id: 1, roles: [] },
    hasAnyRole: () => true // Default to admin-like access
};

vi.mock('../../context/AuthContext', () => ({
    useAuth: () => authContextMock
}));

vi.mock('react-i18next', () => ({
    useTranslation: () => ({
        t: (key) => key,
    }),
}));

const renderNotices = () => {
    return render(
        <MemoryRouter>
            <Notices />
        </MemoryRouter>
    );
};

describe('Notices Page', () => {
    beforeEach(() => {
        vi.clearAllMocks();
        global.fetch = vi.fn((url, options) => {
            const isGet = !options || !options.method || options.method === 'GET';
            const method = options?.method || 'GET';

            // GET /api/notices
            if (url.includes('/api/notices') && isGet) {
                return Promise.resolve({
                    ok: true,
                    json: () => Promise.resolve([
                        {
                            id: 1,
                            title: 'Elevator Maintenance',
                            content: 'Scheduled for Friday.',
                            priority: 'high',
                            created_at: '2023-10-01',
                            created_by: 1
                        }
                    ])
                });
            }

            // GET /api/properties/blocks
            if (url.includes('/api/properties/blocks')) {
                return Promise.resolve({
                    ok: true,
                    json: () => Promise.resolve([{ id: 10, name: 'Block A' }])
                });
            }

            // POST /api/notices
            if (url.includes('/api/notices') && method === 'POST') {
                return Promise.resolve({
                    ok: true,
                    json: () => Promise.resolve({ success: true })
                });
            }

            // DELETE /api/notices/1
            if (url.includes('/api/notices/1') && method === 'DELETE') {
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

    it('renders notices list', async () => {
        renderNotices();
        await waitFor(() => expect(screen.queryByTestId('glass-loader')).not.toBeInTheDocument());

        expect(screen.getByText('notices.title')).toBeInTheDocument();
        expect(screen.getByText('Elevator Maintenance')).toBeInTheDocument();
        expect(screen.getByText('Scheduled for Friday.')).toBeInTheDocument();
    });

    it('opens create modal and creates a notice', async () => {
        renderNotices();
        await waitFor(() => expect(screen.queryByTestId('glass-loader')).not.toBeInTheDocument());

        fireEvent.click(screen.getByText('notices.post_notice'));

        await waitFor(() => expect(screen.getByText('notices.form.title')).toBeInTheDocument());

        // Fill form using inputs by order since simple queries are ambiguous without IDs
        const inputs = screen.getAllByRole('textbox');
        // 0: Title input, 1: Content textarea
        fireEvent.change(inputs[0], { target: { value: 'New Notice Title' } });
        fireEvent.change(inputs[1], { target: { value: 'Notice Content Details' } });

        // Priority Select
        const selects = screen.getAllByTestId('glass-select');
        fireEvent.change(selects[0], { target: { value: 'high' } });

        const submitBtn = screen.getAllByRole('button', { name: 'notices.post_notice' })[1]; // The one in modal
        fireEvent.click(submitBtn);

        await waitFor(() => {
            expect(global.fetch).toHaveBeenCalledWith(
                expect.stringContaining('/api/notices'),
                expect.objectContaining({
                    method: 'POST',
                    body: expect.stringContaining('New Notice Title')
                })
            );
        });
    });

    it('deletes a notice', async () => {
        renderNotices();
        await waitFor(() => expect(screen.queryByTestId('glass-loader')).not.toBeInTheDocument());

        const deleteBtns = screen.getAllByRole('button', { name: 'common.delete' });
        fireEvent.click(deleteBtns[0]);

        await waitFor(() => expect(screen.getByTestId('confirmation-modal')).toBeInTheDocument());

        fireEvent.click(screen.getByText('Confirm Delete'));

        await waitFor(() => {
            expect(global.fetch).toHaveBeenCalledWith(
                expect.stringContaining('/api/notices/1'),
                expect.objectContaining({ method: 'DELETE' })
            );
        });
    });
});
