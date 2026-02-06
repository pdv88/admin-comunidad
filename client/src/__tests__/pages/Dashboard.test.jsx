import React from 'react';
import { render, screen, waitFor, act } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import Dashboard from '../../pages/Dashboard';
import { MemoryRouter } from 'react-router-dom';

// Mocks
vi.mock('../../components/DashboardLayout', () => ({
    default: ({ children }) => <div data-testid="dashboard-layout">{children}</div>
}));
vi.mock('../../pages/DashboardSkeleton', () => ({
    default: () => <div data-testid="dashboard-skeleton">Skeleton Loading...</div>
}));

// Mock Widgets
vi.mock('../../components/payments/ActiveCampaignsWidget', () => ({
    default: () => <div data-testid="active-campaigns-widget">Active Campaigns</div>
}));
vi.mock('../../components/voting/ActivePollsWidget', () => ({
    default: () => <div data-testid="active-polls-widget">Active Polls</div>
}));
vi.mock('../../components/notices/RecentNoticesWidget', () => ({
    default: () => <div data-testid="recent-notices-widget">Recent Notices</div>
}));
vi.mock('../../components/reports/RecentReportsWidget', () => ({
    default: () => <div data-testid="recent-reports-widget">Recent Reports</div>
}));
vi.mock('../../components/dashboards/WelcomeWidget', () => ({
    default: ({ role }) => <div data-testid="welcome-widget">Welcome {role}</div>
}));
vi.mock('../../components/dashboards/widgets/BilledVsCollectedChart', () => ({
    default: () => <div data-testid="financial-chart">Financial Chart</div>
}));

vi.mock('react-i18next', () => ({
    useTranslation: () => ({
        t: (key) => key,
    }),
}));

const mockUser = { id: 1, email: 'test@example.com' };
const authContextMock = {
    user: mockUser,
    activeCommunity: { id: 1, roles: [] },
    hasAnyRole: (roles) => false, // Default resident
    getPrimaryRole: () => 'resident'
};

vi.mock('../../context/AuthContext', () => ({
    useAuth: () => authContextMock
}));

describe('Dashboard Page', () => {
    beforeEach(() => {
        vi.clearAllMocks();
        vi.useFakeTimers({ shouldAdvanceTime: true });
    });

    afterEach(() => {
        vi.useRealTimers();
        vi.restoreAllMocks();
    });

    it('renders loading skeleton initially', () => {
        render(
            <MemoryRouter>
                <Dashboard />
            </MemoryRouter>
        );
        expect(screen.getByTestId('dashboard-skeleton')).toBeInTheDocument();
    });

    it('renders widgets for resident', async () => {
        authContextMock.hasAnyRole = () => false; // Resident
        authContextMock.getPrimaryRole = () => 'resident';

        render(
            <MemoryRouter>
                <Dashboard />
            </MemoryRouter>
        );

        await act(async () => {
            vi.advanceTimersByTime(2000);
        });

        await waitFor(() => expect(screen.queryByTestId('dashboard-skeleton')).not.toBeInTheDocument());

        expect(screen.getByTestId('welcome-widget')).toHaveTextContent('Welcome resident');
        expect(screen.getByTestId('recent-notices-widget')).toBeInTheDocument();
        expect(screen.queryByTestId('financial-chart')).not.toBeInTheDocument();
    });

    it('renders financial chart for admin', async () => {
        authContextMock.hasAnyRole = (roles) => roles.includes('admin');
        authContextMock.getPrimaryRole = () => 'admin';

        render(
            <MemoryRouter>
                <Dashboard />
            </MemoryRouter>
        );

        await act(async () => {
            vi.advanceTimersByTime(2000);
        });

        await waitFor(() => expect(screen.queryByTestId('dashboard-skeleton')).not.toBeInTheDocument());

        expect(screen.getByTestId('welcome-widget')).toHaveTextContent('Welcome admin');
        expect(screen.getByTestId('financial-chart')).toBeInTheDocument();
    });
});
