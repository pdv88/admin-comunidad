import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import Reports from '../../pages/Reports';
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
    default: ({ isOpen, onConfirm, onClose, title }) => isOpen ? (
        <div data-testid="confirmation-modal">
            <h2>{title}</h2>
            <button onClick={onConfirm}>Confirm</button>
            <button onClick={onClose}>Cancel</button>
        </div>
    ) : null
}));
vi.mock('../../components/ReportDetailsPanel', () => ({
    default: ({ report }) => <div data-testid="report-details">Details for {report.title}</div>
}));
vi.mock('../../components/GlassSelect', () => ({
    default: ({ value, onChange, options, ...props }) => (
        <select data-testid="glass-select" value={value} onChange={onChange} {...props}>
            {options.map(opt => (
                <option key={opt.value} value={opt.value}>{opt.label}</option>
            ))}
        </select>
    )
}));
vi.mock('../../components/ImageUploader', () => ({
    default: () => <div>Image Uploader</div>
}));
vi.mock('../../utils/pdfExport', () => ({
    exportReportToPDF: vi.fn()
}));

// Auth Mock
const mockUser = {
    id: 1,
    email: 'user@example.com',
    profile: {
        full_name: 'Test User',
        unit_owners: [{ units: { id: 101, block_id: 1, unit_number: '101' } }]
    }
};

let authContextMock = {
    user: mockUser,
    activeCommunity: { id: 1 },
    hasAnyRole: () => false,
    loading: false
};

vi.mock('../../context/AuthContext', () => ({
    useAuth: () => authContextMock
}));

vi.mock('react-i18next', () => ({
    useTranslation: () => ({
        t: (key, defaultVal) => defaultVal || key,
        i18n: { language: 'en' }
    }),
}));

const renderReports = () => {
    return render(
        <MemoryRouter>
            <Reports />
        </MemoryRouter>
    );
};

describe('Reports Page', () => {
    const mockReports = [
        {
            id: 1,
            title: 'Broken Light',
            description: 'Light in hallway',
            category: 'maintenance',
            status: 'pending',
            created_at: '2023-01-01',
            user_id: 1,
            profiles: { full_name: 'Test User' },
        },
        {
            id: 2,
            title: 'Noise Complaint',
            description: 'Loud music',
            category: 'security',
            status: 'resolved',
            created_at: '2023-01-02',
            user_id: 2,
            profiles: { full_name: 'Neighbor' },
        }
    ];

    beforeEach(() => {
        vi.clearAllMocks();
        authContextMock.hasAnyRole = () => false; // Default resident

        global.fetch = vi.fn((url, options) => {
            console.log(`FETCH: ${url} [${options?.method || 'GET'}]`);
            if (url.includes('/api/reports') && (!options || !options.method || options.method === 'GET')) {
                return Promise.resolve({
                    ok: true,
                    json: () => Promise.resolve({ data: mockReports, count: 2 })
                });
            }
            if (url.includes('/api/properties/blocks')) {
                return Promise.resolve({
                    ok: true,
                    json: () => Promise.resolve([{ id: 1, name: 'Block A' }])
                });
            }
            if (url.includes('/api/reports') && options?.method === 'POST') {
                return Promise.resolve({
                    ok: true,
                    json: () => Promise.resolve({ success: true })
                });
            }
            if (url.includes('/api/reports/1') && options?.method === 'DELETE') {
                return Promise.resolve({
                    ok: true,
                    json: () => Promise.resolve({ success: true })
                });
            }
            if (url.includes('/api/reports/') && options?.method === 'PUT') {
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

    it('renders reports list', async () => {
        renderReports();
        await waitFor(() => expect(screen.queryByTestId('glass-loader')).not.toBeInTheDocument());

        expect(screen.getByText('Issues & Maintenance')).toBeInTheDocument();
        expect(screen.getByText('Broken Light')).toBeInTheDocument();
        expect(screen.getByText('Noise Complaint')).toBeInTheDocument();
    });

    it('shows admin tabs and actions for admin', async () => {
        authContextMock.hasAnyRole = (roles) => roles.includes('admin') || roles.includes('president');

        renderReports();
        await waitFor(() => expect(screen.queryByTestId('glass-loader')).not.toBeInTheDocument());

        expect(screen.getByText('All Reports')).toBeInTheDocument();
        expect(screen.getByText('Report Issue')).toBeInTheDocument();
    });

    it('opens create modal and submits report', async () => {
        authContextMock.hasAnyRole = (roles) => roles.includes('admin');
        renderReports();
        await waitFor(() => expect(screen.queryByTestId('glass-loader')).not.toBeInTheDocument());

        fireEvent.click(screen.getByText('Report Issue'));

        await waitFor(() => expect(screen.getByText('Create Report')).toBeInTheDocument());

        fireEvent.change(screen.getByPlaceholderText('e.g. Broken Light'), { target: { value: 'New Issue' } });
        fireEvent.change(screen.getByPlaceholderText('Describe the issue...'), { target: { value: 'Description' } });

        fireEvent.click(screen.getByText('Submit Report'));

        await waitFor(() => expect(screen.queryByText('Create Report')).not.toBeInTheDocument());

        expect(global.fetch).toHaveBeenCalledWith(
            expect.stringContaining('/api/reports'),
            expect.objectContaining({ method: 'POST', body: expect.stringContaining('New Issue') })
        );
    });

    it('allows deleting own report', async () => {
        renderReports();
        await waitFor(() => expect(screen.queryByTestId('glass-loader')).not.toBeInTheDocument());

        // Broken Light is owned by user (id: 1) and status pending
        const deleteButtons = screen.getAllByText('Delete');
        fireEvent.click(deleteButtons[0]);

        await waitFor(() => expect(screen.getByTestId('confirmation-modal')).toBeInTheDocument());

        fireEvent.click(screen.getByText('Confirm'));

        await waitFor(() => expect(screen.queryByTestId('confirmation-modal')).not.toBeInTheDocument());

        expect(global.fetch).toHaveBeenCalledWith(
            expect.stringContaining('/api/reports/1'),
            expect.objectContaining({ method: 'DELETE' })
        );
    });

    it('allows admin to update status', async () => {
        authContextMock.hasAnyRole = (roles) => roles.includes('admin');

        renderReports();
        await waitFor(() => expect(screen.queryByTestId('glass-loader')).not.toBeInTheDocument());

        // Find "Start Progress" button for pending report
        const startBtn = screen.getByText('Start Progress');
        fireEvent.click(startBtn);

        await waitFor(() => {
            expect(global.fetch).toHaveBeenCalledWith(
                expect.stringContaining('/api/reports/1'),
                expect.objectContaining({
                    method: 'PUT',
                    body: expect.stringContaining('in_progress')
                })
            );
        });
    });
});
