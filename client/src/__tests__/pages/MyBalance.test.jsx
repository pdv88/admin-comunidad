import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import MyBalance from '../../pages/MyBalance';
import { BrowserRouter } from 'react-router-dom';
import { http, HttpResponse } from 'msw';
import { server } from '../../mocks/server';
import { API_URL } from '../../config';

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
vi.mock('../../components/payments/PaymentUpload', () => ({
    default: ({ onSuccess, onCancel }) => (
        <div data-testid="payment-upload">
            <button onClick={onSuccess}>Mock Upload Success</button>
            <button onClick={onCancel}>Mock Cancel</button>
        </div>
    )
}));

// Define stable activeCommunity object to prevent infinite useEffect loops
const mockActiveCommunity = { community_id: 1, name: 'Test Community' };

vi.mock('../../context/AuthContext', () => ({
    useAuth: () => ({
        activeCommunity: mockActiveCommunity
    })
}));

vi.mock('react-i18next', () => ({
    useTranslation: () => ({
        t: (key) => key,
        i18n: { language: 'en' }
    }),
}));

const renderMyBalance = () => {
    return render(
        <BrowserRouter>
            <MyBalance />
        </BrowserRouter>
    );
};

describe('MyBalance Page', () => {
    beforeEach(() => {
        vi.clearAllMocks();
        server.resetHandlers();
        vi.spyOn(Storage.prototype, 'getItem').mockReturnValue('fake-token');
    });

    afterEach(() => {
        vi.restoreAllMocks();
    });

    it('renders loading state initially', () => {
        renderMyBalance();
        expect(screen.getByTestId('glass-loader')).toBeInTheDocument();
    });

    it('renders fee table after data load', async () => {
        const feesData = [
            {
                id: 1,
                period: '2023-10',
                amount: 100,
                status: 'pending',
                units: { block_id: 10, unit_number: '101' },
                unit_number: '101'
            }
        ];

        server.use(
            http.get('*/api/properties/blocks*', () => {
                return HttpResponse.json([{ id: 10, name: 'Block A', parent_id: null }]);
            }),
            http.get('*/api/maintenance/my-statement*', () => {
                return HttpResponse.json({
                    data: feesData,
                    totalPages: 1,
                    totalCount: 1
                });
            })
        );

        renderMyBalance();

        await waitFor(() => {
            expect(screen.queryByTestId('glass-loader')).not.toBeInTheDocument();
        }, { timeout: 3000 });

        expect(screen.getByText('100')).toBeInTheDocument();
        expect(screen.getByText(/Block A/)).toBeInTheDocument();
        expect(screen.getByText('101')).toBeInTheDocument();
    });

    it('switches to extraordinary fees tab', async () => {
        const extraFees = [
            {
                id: 2,
                campaigns: { name: 'Roof Repair', deadline: '2023-12-31' },
                amount: 500,
                status: 'pending'
            }
        ];

        server.use(
            http.get('*/api/properties/blocks*', () => HttpResponse.json([])),
            http.get('*/api/maintenance/my-statement*', ({ request }) => {
                const url = new URL(request.url);
                const type = url.searchParams.get('type');

                if (type === 'extraordinary') {
                    return HttpResponse.json({
                        data: extraFees,
                        totalPages: 1,
                        totalCount: 1
                    });
                }
                return HttpResponse.json({ data: [], totalPages: 0, totalCount: 0 });
            })
        );

        renderMyBalance();

        await waitFor(() => expect(screen.queryByTestId('glass-loader')).not.toBeInTheDocument(), { timeout: 3000 });

        const extraTab = screen.getByText(/maintenance.tab_extraordinary/i);
        fireEvent.click(extraTab);

        await waitFor(() => {
            expect(screen.getByText('Roof Repair')).toBeInTheDocument();
        }, { timeout: 3000 });
        expect(screen.getByText('500')).toBeInTheDocument();
    });

    it('opens payment modal when pay button clicked', async () => {
        const feesData = [
            {
                id: 1,
                period: '2023-10',
                amount: 100,
                status: 'pending',
                payment_id: null,
                units: { block_id: 10 },
                unit_number: '101'
            }
        ];

        server.use(
            http.get('*/api/properties/blocks*', () => HttpResponse.json([])),
            http.get('*/api/maintenance/my-statement*', () => {
                return HttpResponse.json({ data: feesData, totalPages: 1, totalCount: 1 });
            })
        );

        renderMyBalance();

        await waitFor(() => expect(screen.queryByTestId('glass-loader')).not.toBeInTheDocument(), { timeout: 3000 });
        await waitFor(() => expect(screen.getByText('100')).toBeInTheDocument());

        const payBtn = screen.getByText(/maintenance.pay/i);
        fireEvent.click(payBtn);

        expect(screen.getByTestId('modal-portal')).toBeInTheDocument();
        expect(screen.getByTestId('payment-upload')).toBeInTheDocument();
    });
});
