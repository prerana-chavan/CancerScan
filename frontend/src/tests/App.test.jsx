import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { BrowserRouter } from 'react-router-dom';
import React from 'react';

// Mocks to bypass complex UI rendering in tests
vi.mock('framer-motion', () => ({
    motion: {
        div:    ({ children, ...props }) => <div {...props}>{children}</div>,
        h1:     ({ children, ...props }) => <h1 {...props}>{children}</h1>,
        h2:     ({ children, ...props }) => <h2 {...props}>{children}</h2>,
        button: ({ children, ...props }) => <button {...props}>{children}</button>,
    },
    AnimatePresence: ({ children }) => <>{children}</>
}));

vi.mock('../components/ParticleBackground', () => ({
    default: () => <div data-testid="particle-bg" />
}));

vi.mock('lucide-react', () => ({
    Activity: () => <div data-testid="lucide-activity" />,
    Eye:      () => <div data-testid="lucide-eye" />,
    EyeOff:   () => <div data-testid="lucide-eyeoff" />,
    Loader2:  () => <div data-testid="lucide-loader2" />
}));

// Mock Auth Context
const mockLogin = vi.fn();
const mockNavigate = vi.fn();

vi.mock('react-router-dom', async () => {
    const actual = await vi.importActual('react-router-dom');
    return {
        ...actual,
        useNavigate: () => mockNavigate
    };
});

vi.mock('../context/AuthContext', () => {
    return {
        useAuth: () => ({
            user: null,
            token: null,
            login: mockLogin,
            register: vi.fn(),
            logout: vi.fn(),
            isAuthenticated: false,
        }),
        AuthProvider: ({ children }) => <>{children}</>
    };
});

import LoginPage from '../pages/LoginPage';

const renderLogin = () => {
    return render(
        <BrowserRouter>
            <LoginPage />
        </BrowserRouter>
    );
};

describe('LoginPage Core Functionality', () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });

    it('renders the login form', () => {
        renderLogin();
        expect(screen.getByText(/Welcome Back/i)).toBeInTheDocument();
        expect(screen.getByPlaceholderText(/dr\.name@hospital\.org/i)).toBeInTheDocument();
        expect(screen.getByPlaceholderText(/Enter your password/i)).toBeInTheDocument();
    });

    it('shows validation error when submitting empty form', async () => {
        renderLogin();
        
        const submitBtn = screen.getByRole('button', { name: /Access Dashboard/i });
        fireEvent.submit(submitBtn.closest('form'));

        await waitFor(() => {
            expect(screen.getByText('Please enter both email and password')).toBeInTheDocument();
        });
        expect(mockLogin).not.toHaveBeenCalled();
    });

    it('calls login function on submit', async () => {
        mockLogin.mockResolvedValueOnce({ success: true, user: { role: 'doctor' } });
        renderLogin();

        const emailInput = screen.getByPlaceholderText(/dr\.name@hospital\.org/i);
        const passwordInput = screen.getByPlaceholderText(/Enter your password/i);
        const submitBtn = screen.getByRole('button', { name: /Access Dashboard/i });

        fireEvent.change(emailInput, { target: { value: 'doctor@test.com' } });
        fireEvent.change(passwordInput, { target: { value: 'Pass123' } });
        fireEvent.submit(submitBtn.closest('form'));

        await waitFor(() => {
            expect(mockLogin).toHaveBeenCalledWith('doctor@test.com', 'Pass123');
        });
    });

    it('navigates to dashboard on successful login', async () => {
        mockLogin.mockResolvedValue({ success: true, user: { role: 'doctor' } });
        renderLogin();

        fireEvent.change(screen.getByPlaceholderText(/dr\.name/i), { target: { value: 'test@host.com' } });
        fireEvent.change(screen.getByPlaceholderText(/password/i), { target: { value: 'pw123' } });
        
        const submitBtn = screen.getByRole('button', { name: /Access Dashboard/i });
        fireEvent.submit(submitBtn.closest('form'));

        await waitFor(() => {
            expect(mockNavigate).toHaveBeenCalledWith('/dashboard');
        });
    });
});
