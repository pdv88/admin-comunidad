import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import Login from '../../pages/Login';
import { BrowserRouter } from 'react-router-dom';

// Hoist mocks
const mocks = vi.hoisted(() => ({
    login: vi.fn(),
    navigate: vi.fn()
}));

vi.mock('../../context/AuthContext', () => ({
    useAuth: () => ({
        login: mocks.login,
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

const renderLogin = () => {
    return render(
        <BrowserRouter>
            <Login />
        </BrowserRouter>
    );
};

describe('Login Page', () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });

    it('renders login form correctly', () => {
        renderLogin();
        expect(screen.getByLabelText(/Email/i)).toBeInTheDocument();
    });

    it('updates input fields when typing', () => {
        renderLogin();
        const emailInput = screen.getByLabelText(/Email/i);
        fireEvent.change(emailInput, { target: { value: 'test@example.com' } });
        expect(emailInput.value).toBe('test@example.com');
    });

    it('calls login function on form submission', async () => {
        renderLogin();
        mocks.login.mockResolvedValueOnce();
        fireEvent.change(screen.getByLabelText(/Email/i), { target: { value: 'test@example.com' } });
        fireEvent.change(screen.getByLabelText(/Password/i), { target: { value: 'password123' } });
        fireEvent.click(screen.getByRole('button', { name: /auth.signin_btn/i }));

        await waitFor(() => {
            expect(mocks.login).toHaveBeenCalledWith('test@example.com', 'password123');
        });
        expect(mocks.navigate).toHaveBeenCalledWith('/app/dashboard');
    });

    it('displays error message on login failure', async () => {
        renderLogin();
        const errorMsg = 'Invalid credentials';
        mocks.login.mockRejectedValueOnce(new Error(errorMsg));
        fireEvent.change(screen.getByLabelText(/Email/i), { target: { value: 'fail@example.com' } });
        fireEvent.change(screen.getByLabelText(/Password/i), { target: { value: 'wrongpass' } });
        fireEvent.click(screen.getByRole('button', { name: /auth.signin_btn/i }));

        await waitFor(() => {
            expect(screen.getByText(errorMsg)).toBeInTheDocument();
        });
    });

    it('displays specific error for unverified email', async () => {
        renderLogin();
        mocks.login.mockRejectedValueOnce(new Error('Email not confirmed'));

        // Fill required fields to ensure submit handler fires
        fireEvent.change(screen.getByLabelText(/Email/i), { target: { value: 'unverified@example.com' } });
        fireEvent.change(screen.getByLabelText(/Password/i), { target: { value: 'pass123' } });

        fireEvent.click(screen.getByRole('button', { name: /auth.signin_btn/i }));

        await waitFor(() => {
            const inDoc = screen.queryByText(/inbox/i) || screen.queryByText('auth.email_not_confirmed');
            expect(inDoc).toBeInTheDocument();
        });
    });
});
