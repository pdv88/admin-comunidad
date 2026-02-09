import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useTranslation } from 'react-i18next';
import { API_URL } from '../config';
import Header from '../assets/components/Header';
import Footer from '../assets/components/Footer';

const Login = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [isUnverified, setIsUnverified] = useState(false);
  const [resending, setResending] = useState(false);
  const { login } = useAuth();
  const navigate = useNavigate();
  const { t } = useTranslation();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      await login(email, password);
      navigate('/app/dashboard');
    } catch (err) {
      if (err.message.includes('Email not confirmed')) {
        setError(t('auth.email_not_confirmed', 'Email not confirmed. Please check your inbox.'));
        setIsUnverified(true);
      } else if (
        err.message.includes('JSON') ||
        err.message.includes('fetch') ||
        err.message.includes('Failed to execute') ||
        err.message.includes('expected pattern') ||
        err.message.includes('NetworkError') ||
        err.message.includes('Connection refused')
      ) {
        setError(t('auth.login_error_generic', 'Login failed. Please check your connection or try again later.'));
      } else {
        setError(err.message);
      }
    } finally {
      setLoading(false);
    }
  };

  const handleResend = async () => {
    setResending(true);
    try {
      // We assume a dedicated endpoint or use auth endpoint
      const response = await fetch(`${API_URL}/api/auth/resend-verification`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email })
      });

      if (!response.ok) throw new Error('Failed to resend');

      alert(t('auth.verification_resent', 'Verification email sent!'));
      setIsUnverified(false); // Hide button
    } catch (e) {
      alert('Error resending email');
    } finally {
      setResending(false);
    }
  };

  return (
    <div className="relative flex flex-col min-h-screen">
      <Header />

      <main className="flex-grow flex items-center justify-center px-4 pt-32 pb-12">
        <div className="w-full max-w-md p-6 bg-white/40 backdrop-blur-md border border-gray-200 rounded-3xl shadow-lg dark:bg-neutral-900/40 dark:border-neutral-700">
          <div className="text-center">
            <h1 className="block text-2xl font-bold text-gray-800 dark:text-white">{t('auth.signin_title')}</h1>
            <p className="mt-2 text-sm text-gray-600 dark:text-neutral-400">
              {t('auth.no_account')}
              {' '}
              <Link className="text-blue-600 decoration-2 hover:underline font-medium dark:text-blue-500" to="/register">
                {t('auth.signup_here')}
              </Link>
            </p>
          </div>

          <div className="mt-5">
            {/* <!-- Form --> */}
            <form onSubmit={handleSubmit}>
              <div className="grid gap-y-4">
                {/* <!-- Form Group --> */}
                <div>
                  <label htmlFor="email" className="block text-sm mb-2 dark:text-white">{t('auth.email')}</label>
                  <div className="relative">
                    <input
                      type="email"
                      id="email"
                      name="email"
                      className="py-3 px-4 block w-full bg-white/30 shadow-2xl backdrop-blur-md border-gray-200 rounded-full text-sm focus:border-blue-500 focus:ring-blue-500 disabled:opacity-50 disabled:pointer-events-none dark:bg-neutral-800 dark:border-neutral-700 dark:text-neutral-400 dark:placeholder-neutral-500 dark:focus:ring-neutral-600"
                      required
                      aria-describedby="email-error"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                    />
                    <div className="hidden absolute inset-y-0 end-0 flex items-center pointer-events-none pe-3">
                      <svg className="size-5 text-red-500" width="16" height="16" fill="currentColor" viewBox="0 0 16 16" aria-hidden="true">
                        <path d="M16 8A8 8 0 1 1 0 8a8 8 0 0 1 16 0zM8 4a.905.905 0 0 0-.9.995l.35 3.507a.552.552 0 0 0 1.1 0l.35-3.507A.905.905 0 0 0 8 4zm.002 6a1 1 0 1 0 0 2 1 1 0 0 0 0-2z" />
                      </svg>
                    </div>
                  </div>
                  {error && <p className="text-xs text-red-600 mt-2" id="email-error">{error}</p>}
                </div>
                {/* <!-- End Form Group --> */}

                {/* <!-- Form Group --> */}
                <div>
                  <div className="flex justify-between items-center">
                    <label htmlFor="password" className="block text-sm mb-2 dark:text-white">{t('auth.password')}</label>
                    <Link className="text-sm text-blue-600 decoration-2 hover:underline font-medium dark:text-blue-500" to="/forgot-password">{t('auth.forgot_password')}</Link>
                  </div>
                  <div className="relative">
                    <input
                      type="password"
                      id="password"
                      name="password"
                      className="py-3 px-4 block w-full bg-white/30 shadow-2xl backdrop-blur-md border-gray-200 rounded-full text-sm focus:border-blue-500 focus:ring-blue-500 disabled:opacity-50 disabled:pointer-events-none dark:bg-neutral-800 dark:border-neutral-700 dark:text-neutral-400 dark:placeholder-neutral-500 dark:focus:ring-neutral-600"
                      required
                      aria-describedby="password-error"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                    />
                    <div className="hidden absolute inset-y-0 end-0 flex items-center pointer-events-none pe-3">
                      <svg className="size-5 text-red-500" width="16" height="16" fill="currentColor" viewBox="0 0 16 16" aria-hidden="true">
                        <path d="M16 8A8 8 0 1 1 0 8a8 8 0 0 1 16 0zM8 4a.905.905 0 0 0-.9.995l.35 3.507a.552.552 0 0 0 1.1 0l.35-3.507A.905.905 0 0 0 8 4zm.002 6a1 1 0 1 0 0 2 1 1 0 0 0 0-2z" />
                      </svg>
                    </div>
                  </div>
                </div>
                {/* <!-- End Form Group --> */}

                <button
                  type="submit"
                  disabled={loading}
                  className="w-full inline-flex justify-center items-center gap-x-3 text-center bg-gradient-to-r from-blue-600 via-violet-600 to-blue-600 bg-[length:200%_auto] text-white text-sm font-semibold rounded-full hover:shadow-lg hover:bg-right active:scale-95 transition-all duration-500 py-3 px-6 shadow-lg shadow-blue-500/30 disabled:opacity-50 disabled:pointer-events-none"
                >
                  {loading ? (
                    <>
                      <svg className="animate-spin h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                      </svg>
                      {t('auth.signing_in', 'Signing in...')}
                    </>
                  ) : (
                    t('auth.signin_btn')
                  )}
                </button>
              </div>
            </form>
            {/* <!-- End Form --> */}
          </div>
        </div>
      </main>

      <Footer />
    </div>
  );
};

export default Login;