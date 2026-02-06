import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import Maintenance from '../../pages/Maintenance';
import { MemoryRouter } from 'react-router-dom';
import { http, HttpResponse } from 'msw';
import { server } from '../../mocks/server';

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
    default: ({ isOpen, onConfirm, onCancel, title }) => isOpen ? (
        <div data-testid="confirmation-modal">
            <h2>{title}</h2>
            <button onClick={onConfirm}>Confirm</button>
            <button onClick={onCancel}>Cancel</button>
        </div>
    ) : null
}));

// Mock URL.createObjectURL for export test
global.URL.createObjectURL = vi.fn(() => 'mock-url');

// Stable User/Community Mocks
const mockCommunityUser = { community_id: 1, name: 'Test Community', roles: [{ name: 'resident' }] };
const mockCommunityAdmin = { community_id: 1, name: 'Test Community', roles: [{ name: 'admin' }] };

// Dynamic Auth Mock
const authContextMock = {
    user: { id: 1, email: 'test@example.com' },
    activeCommunity: mockCommunityUser, // Default to user
    loading: false,
    hasAnyRole: (requiredRoles) => {
        const rolesData = authContextMock.activeCommunity?.roles;
        const userRoleName = Array.isArray(rolesData) ? rolesData[0]?.name : rolesData?.name;
        return requiredRoles.includes(userRoleName);
    }
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

const renderMaintenance = (role = 'resident', initialEntries = ['/app/maintenance']) => {
    // Update mock based on requested role
    authContextMock.activeCommunity = role === 'admin' ? mockCommunityAdmin : mockCommunityUser;

    return render(
        <MemoryRouter initialEntries={initialEntries}>
            <Maintenance />
        </MemoryRouter>
    );
};

describe('Maintenance Page', () => {
    beforeEach(() => {
        vi.clearAllMocks();
        server.resetHandlers();
        vi.spyOn(Storage.prototype, 'getItem').mockReturnValue('fake-token');
    });

    afterEach(() => {
        vi.restoreAllMocks();
    });

    it('renders loading state initially', () => {
        renderMaintenance();
        expect(screen.getByTestId('glass-loader')).toBeInTheDocument();
    });

    it('renders fees for resident', async () => {
        const feesData = [
            {
                id: 1,
                period: '2023-10',
                amount: 150,
                status: 'pending',
                units: { block_id: 10, unit_number: '101' },
                unit_number: '101'
            }
        ];

        server.use(
            http.get('*/api/properties/blocks*', () => HttpResponse.json([])),
            http.get('*/api/maintenance/my-statement*', () => {
                return HttpResponse.json(feesData);
            })
        );

        renderMaintenance('resident');

        await waitFor(() => {
            expect(screen.queryByTestId('glass-loader')).not.toBeInTheDocument();
        });

        expect(screen.getByText('maintenance.title')).toBeInTheDocument();
        expect(screen.getByText('150')).toBeInTheDocument();
        expect(screen.getByText('101')).toBeInTheDocument();
    });

    it('switches tabs', async () => {
        server.use(
            http.get('*/api/properties/blocks*', () => HttpResponse.json([])),
            http.get('*/api/maintenance/my-statement*', () => HttpResponse.json([]))
        );

        renderMaintenance('resident');
        await waitFor(() => expect(screen.queryByTestId('glass-loader')).not.toBeInTheDocument());

        const extraTab = screen.getByText('maintenance.tab_extraordinary');
        fireEvent.click(extraTab);

        expect(screen.getByText('maintenance.tab_extraordinary')).toBeInTheDocument();
    });

    it('renders admin view with filters and generate button', async () => {
        const feesData = {
            data: [
                {
                    id: 2,
                    period: '2023-11',
                    amount: 200,
                    status: 'paid',
                    unit_number: '102',
                    owner_name: 'John Doe'
                }
            ],
            totalPages: 1,
            totalCount: 1
        };

        server.use(
            http.get('*/api/properties/blocks*', () => HttpResponse.json([{ id: 1, name: 'Block A' }])),
            http.get('*/api/maintenance/status*', () => {
                return HttpResponse.json(feesData);
            })
        );

        renderMaintenance('admin');

        await waitFor(() => {
            expect(screen.queryByTestId('glass-loader')).not.toBeInTheDocument();
        });

        // Admin specific elements
        expect(screen.getByText('maintenance.generate_btn_short')).toBeInTheDocument();
        expect(screen.getByText('common.export')).toBeInTheDocument();
        expect(screen.getByText('John Doe')).toBeInTheDocument();
    });

    it('opens generate fees modal for admin', async () => {
        server.use(
            http.get('*/api/properties/blocks*', () => HttpResponse.json([])),
            http.get('*/api/maintenance/status*', () => HttpResponse.json({ data: [], totalPages: 0 }))
        );

        renderMaintenance('admin');
        await waitFor(() => expect(screen.queryByTestId('glass-loader')).not.toBeInTheDocument());

        const generateBtn = screen.getByText('maintenance.generate_btn_short');
        fireEvent.click(generateBtn);

        expect(screen.getByText((content, element) => {
            return element.tagName.toLowerCase() === 'h3' && content.includes('maintenance.generate_title');
        })).toBeInTheDocument();
    });
});
