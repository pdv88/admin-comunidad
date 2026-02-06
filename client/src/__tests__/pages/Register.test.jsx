import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import Register from '../../pages/Register';
import { BrowserRouter } from 'react-router-dom';
import { http, HttpResponse } from 'msw';
import { server } from '../../mocks/server';
import { API_URL } from '../../config';

// Hoist mocks
const mocks = vi.hoisted(() => ({
    navigate: vi.fn()
}));

vi.mock('../../context/AuthContext', () => ({
    useAuth: () => ({
        user: null
    })
}));

vi.mock('react-router-dom', async () => {
    const actual = await vi.importActual('react-router-dom');
    return {
        ...actual,
        useNavigate: () => mocks.navigate
    };
});

vi.mock('react-i18next', () => ({
    useTranslation: () => ({
        t: (key, def) => def || key,
        i18n: {
            language: 'en',
            changeLanguage: vi.fn(),
        },
    }),
}));

const renderRegister = () => {
    return render(
        <BrowserRouter>
            <Register />
        </BrowserRouter>
    );
};

describe('Register Page', () => {
    beforeEach(() => {
        vi.clearAllMocks();
        server.resetHandlers();
        vi.useRealTimers();
    });

    it('renders register form correctly', () => {
        renderRegister();
        expect(screen.getByLabelText(/auth.fullname/i)).toBeInTheDocument();
        expect(screen.getByRole('button', { name: /auth.signup_btn/i })).toBeInTheDocument();
    });

    it('shows error if passwords do not match', async () => {
        renderRegister();

        // Fill ALL required fields to bypass HTML5 validation
        fireEvent.change(screen.getByLabelText(/auth.fullname/i), { target: { value: 'John Doe' } });
        fireEvent.change(screen.getByPlaceholderText(/Residencial Las Torres/i), { target: { value: 'Test Community' } });
        fireEvent.change(screen.getByPlaceholderText(/Av. Principal 123/i), { target: { value: '123 St' } });
        fireEvent.change(screen.getByLabelText(/auth.email/i), { target: { value: 'new@example.com' } });

        fireEvent.change(screen.getByLabelText(/auth.password/i), { target: { value: 'password123' } });
        fireEvent.change(screen.getByLabelText(/auth.confirm_password/i), { target: { value: 'password456' } });

        fireEvent.click(screen.getByRole('button', { name: /auth.signup_btn/i }));

        await waitFor(() => {
            expect(screen.getByText(/auth.password_mismatch/i)).toBeInTheDocument();
        });
    });

    it('submits form successfully', async () => {
        // Use real timers for reliability with msw fetch
        // We will wait 3000ms+ for navigation

        server.use(
            http.post(`${API_URL}/api/auth/register`, () => {
                return HttpResponse.json({ message: 'Success' }, { status: 201 });
            })
        );

        renderRegister();

        fireEvent.change(screen.getByLabelText(/auth.fullname/i), { target: { value: 'John Doe' } });
        fireEvent.change(screen.getByPlaceholderText(/Residencial Las Torres/i), { target: { value: 'Test Community' } });
        fireEvent.change(screen.getByPlaceholderText(/Av. Principal 123/i), { target: { value: '123 St' } });
        fireEvent.change(screen.getByLabelText(/auth.email/i), { target: { value: 'new@example.com' } });
        fireEvent.change(screen.getByLabelText(/auth.password/i), { target: { value: 'pass123' } });
        fireEvent.change(screen.getByLabelText(/auth.confirm_password/i), { target: { value: 'pass123' } });

        fireEvent.click(screen.getByRole('button', { name: /auth.signup_btn/i }));

        // Wait for success message
        await waitFor(() => {
            expect(screen.getByText(/auth.registration_success/i)).toBeInTheDocument();
        });

        // Wait for navigation (approx 3000ms)
        // We expect it to happen within 4000ms
        await waitFor(() => {
            expect(mocks.navigate).toHaveBeenCalledWith('/login');
        }, { timeout: 4000 });
    });
});
