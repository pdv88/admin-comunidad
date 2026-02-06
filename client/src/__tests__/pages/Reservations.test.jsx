import React from 'react';
import { render, screen, fireEvent, waitFor, within } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import Reservations from '../../pages/Reservations';
import { MemoryRouter } from 'react-router-dom';
import { http, HttpResponse } from 'msw';
import { server } from '../../mocks/server';
import userEvent from '@testing-library/user-event';

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

// Mock react-datepicker to simplify date selection in tests
vi.mock('react-datepicker', () => ({
    default: ({ onChange, placeholderText, value, selected }) => (
        <input
            data-testid="date-picker"
            placeholder={placeholderText}
            onChange={(e) => onChange(new Date(e.target.value))}
            value={selected ? selected.toISOString().split('T')[0] : ''}
        />
    )
}));

// Auth Mock
const mockUser = { id: 1, email: 'user@example.com', full_name: 'Test User' };
const mockAdmin = { id: 2, email: 'admin@example.com', full_name: 'Admin User' };

const authContextMock = {
    user: mockUser,
    hasAnyRole: (roles) => false,
    hasRole: (role) => false,
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

const renderReservations = () => {
    return render(
        <MemoryRouter>
            <Reservations />
        </MemoryRouter>
    );
};

describe('Reservations Page', () => {
    beforeEach(() => {
        vi.clearAllMocks();
        server.resetHandlers();
    });

    afterEach(() => {
        vi.restoreAllMocks();
    });

    it('renders loading state initially', () => {
        renderReservations();
        expect(screen.getByTestId('glass-loader')).toBeInTheDocument();
    });

    it('renders user reservations and booking button', async () => {
        const amenities = [{ id: 1, name: 'Tennis Court', is_reservable: true }];
        const reservations = [
            {
                id: 1,
                amenity_id: 1,
                amenities: { name: 'Tennis Court' },
                date: '2023-11-01',
                start_time: '10:00:00',
                end_time: '11:00:00',
                status: 'approved',
                user_id: 1,
                profiles: { full_name: 'Test User' },
                units: { unit_number: '101', blocks: { name: 'A' } }
            }
        ];

        server.use(
            http.get('*/api/amenities', () => HttpResponse.json(amenities)),
            http.get('*/api/amenities/reservations', ({ request }) => {
                const url = new URL(request.url);
                const timeRange = url.searchParams.get('time_range');
                if (timeRange === 'upcoming') return HttpResponse.json({ data: reservations, count: 1 });
                return HttpResponse.json({ data: [], count: 0 }); // Past
            })
        );

        renderReservations();

        await waitFor(() => expect(screen.queryByTestId('glass-loader')).not.toBeInTheDocument());

        expect(screen.getByText('Reservations')).toBeInTheDocument();
        expect(screen.getByText('New Reservation')).toBeInTheDocument();
        expect(screen.getAllByText('Tennis Court')[0]).toBeInTheDocument();
        expect(screen.getByText('approved')).toBeInTheDocument();
    });

    it('allows opening booking modal and selecting amenity', async () => {
        const categories = [{ id: 1, name: 'Pool', is_reservable: true, reservation_limits: { type: 'hour', schedule_start: '09:00', schedule_end: '18:00' } }];

        server.use(
            http.get('*/api/amenities', () => HttpResponse.json(categories)),
            http.get('*/api/amenities/reservations', () => HttpResponse.json({ data: [], count: 0 }))
        );

        renderReservations();
        await waitFor(() => expect(screen.queryByTestId('glass-loader')).not.toBeInTheDocument());

        const newBookingBtn = screen.getByText('New Reservation');
        fireEvent.click(newBookingBtn);

        await waitFor(() => expect(screen.getByText('Request Reservation')).toBeInTheDocument());

        const amenitySelect = screen.getByDisplayValue('Select Amenity...');
        fireEvent.change(amenitySelect, { target: { value: '1' } });

        expect(amenitySelect.value).toBe('1');
    });

    it('shows community tab for admin', async () => {
        authContextMock.hasAnyRole = () => true; // Make admin

        server.use(
            http.get('*/api/amenities', () => HttpResponse.json([])),
            http.get('*/api/amenities/reservations', () => HttpResponse.json({ data: [], count: 0 })),
            http.get('*/api/properties/users', () => HttpResponse.json([]))
        );

        renderReservations();
        await waitFor(() => expect(screen.queryByTestId('glass-loader')).not.toBeInTheDocument());

        expect(screen.getByText('Community')).toBeInTheDocument();
    });

    it('submits a new booking', async () => {
        // Reset auth mock for this test to be a normal user
        authContextMock.hasAnyRole = () => false;

        const amenities = [{ id: 1, name: 'Gym', is_reservable: true, reservation_limits: { type: 'hour', schedule_start: '09:00', schedule_end: '23:00' } }];

        server.use(
            http.get('*/api/amenities', () => HttpResponse.json(amenities)),
            http.get('*/api/amenities/reservations', () => HttpResponse.json({ data: [], count: 0 })),
            http.post('*/api/amenities/reservations', () => HttpResponse.json({ success: true }))
        );

        renderReservations();
        await waitFor(() => expect(screen.queryByTestId('glass-loader')).not.toBeInTheDocument());

        fireEvent.click(screen.getByText('New Reservation'));

        // Wait for modal
        await waitFor(() => expect(screen.getByText('Request Reservation')).toBeInTheDocument());

        // Fill form
        fireEvent.change(screen.getByDisplayValue('Select Amenity...'), { target: { value: '1' } });

        // Date picker mock (typing date) - using ISO string part as value logic in mock
        const dateInput = screen.getByTestId('date-picker');
        fireEvent.change(dateInput, { target: { value: '2023-12-01' } });

        // Select time slot
        await waitFor(() => expect(screen.getByText('09:00')).toBeInTheDocument());
        fireEvent.click(screen.getByText('09:00'));

        // Submit
        // Note: The submit button text is likely 'Confirm Booking' or 'Submit' or similar? 
        // Checking component code: {isSubmitting ? '...' : t('reservations.request_booking', 'Request Booking')}
        // Wait, the title is 'Request Reservation' (key 'reservations.request_booking')
        // And the button is also using 'reservations.request_booking' or similar?
        // Let's check the previous `view_file` output for lines around 798.
        // It says: {isSubmitting ? ... : t('reservations.submit_booking', 'Book Now')} - Wait, line 798 in view_file was truncated.
        // Let's assume standard "Book" or use getByRole('button', {name: ...}) or find the button by type submit

        const submitBtn = screen.getByRole('button', { name: /book|reserve|request/i });
        // Actually, let's look at the button text in line 798... ah it was truncated. 
        // I'll try to find it by type submit.
        const form = screen.getByText('Request Reservation').closest('form');
        // fireEvent.submit(form); // This is safer if I don't know the exact button text.

        // Or finding the submit button inside the form
        const btn = within(form).getByRole('button', { name: /request/i });
        fireEvent.click(btn);

        await waitFor(() => expect(screen.queryByText('Request Reservation')).not.toBeInTheDocument());
    });
});
