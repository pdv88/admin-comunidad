import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import Header from '../assets/components/Header';
import Footer from '../assets/components/Footer';
import { API_URL } from '../config';

const Register = () => {
  const [formData, setFormData] = useState({
    fullName: '',
    email: '',
    communityName: '',
    communityAddress: '',
    password: '',
    confirmPassword: '',
  });
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();
  const { t } = useTranslation();

  const handleChange = (e) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setSuccess('');
    setLoading(true);

    if (formData.password !== formData.confirmPassword) {
      setLoading(false);
      return setError(t('auth.password_mismatch'));
    }

    try {
      const response = await fetch(`${API_URL}/api/auth/register`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          fullName: formData.fullName,
          email: formData.email,
          communityName: formData.communityName,
          communityAddress: formData.communityAddress,
          password: formData.password
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Registration failed');
      }

      setSuccess(t('auth.registration_success'));
      setTimeout(() => navigate('/login'), 3000);
    } catch (err) {
      setError(err.message);
      setLoading(false);
    }
    // Note: setLoading(false) in finally block would be cleaner but logic above has early return/asyncs
  };

  return (
    <div className="relative flex flex-col min-h-screen">
      <Header />

      <main className="flex-grow flex items-center justify-center px-4 pt-32 pb-12">
        <div className="w-full max-w-md p-6 bg-white/40 backdrop-blur-md border border-gray-200 rounded-3xl shadow-lg dark:bg-neutral-900/40 dark:border-neutral-700">
          <div className="text-center">
            <h1 className="block text-2xl font-bold text-gray-800 dark:text-white">{t('auth.signup_title')}</h1>
            <p className="mt-2 text-sm text-gray-600 dark:text-neutral-400">
              {t('auth.has_account')}
              {' '}
              <Link className="text-blue-600 decoration-2 hover:underline font-medium dark:text-blue-500" to="/login">
                {t('auth.signin_here')}
              </Link>
            </p>
          </div>

          <div className="mt-5">
            <form onSubmit={handleSubmit}>
              <div className="grid gap-y-4">

                <div>
                  <label htmlFor="fullName" className="block text-sm mb-2 dark:text-white">{t('auth.fullname')}</label>
                  <input type="text" id="fullName" name="fullName" value={formData.fullName} onChange={handleChange} className="py-3 px-4 block w-full border-gray-200 rounded-full bg-white/30 shadow-2xl text-sm focus:border-blue-500 focus:ring-blue-500 dark:bg-neutral-800 dark:border-neutral-700 dark:text-neutral-400 dark:placeholder-neutral-500 dark:focus:ring-neutral-600" required />
                </div>

                <div>
                  <label htmlFor="communityName" className="block text-sm mb-2 dark:text-white">{t('auth.community_name', 'Community Name')}</label>
                  <input type="text" id="communityName" name="communityName" value={formData.communityName} onChange={handleChange} className="py-3 px-4 block w-full border-gray-200 rounded-full bg-white/30 shadow-2xl text-sm focus:border-blue-500 focus:ring-blue-500 dark:bg-neutral-800 dark:border-neutral-700 dark:text-neutral-400 dark:placeholder-neutral-500 dark:focus:ring-neutral-600" required placeholder={t('auth.community_name_placeholder', 'e.g. Residencial Las Torres')} />
                </div>

                <div>
                  <label htmlFor="communityAddress" className="block text-sm mb-2 dark:text-white">{t('auth.community_address', 'Address')}</label>
                  <input type="text" id="communityAddress" name="communityAddress" value={formData.communityAddress} onChange={handleChange} className="py-3 px-4 block w-full border-gray-200 rounded-full bg-white/30 shadow-2xl text-sm focus:border-blue-500 focus:ring-blue-500 dark:bg-neutral-800 dark:border-neutral-700 dark:text-neutral-400 dark:placeholder-neutral-500 dark:focus:ring-neutral-600" required placeholder={t('auth.community_address_placeholder', 'e.g. Av. Principal 123')} />
                </div>

                <div>
                  <label htmlFor="email" className="block text-sm mb-2 dark:text-white">{t('auth.email')}</label>
                  <input type="email" id="email" name="email" value={formData.email} onChange={handleChange} className="py-3 px-4 block w-full border-gray-200 rounded-full bg-white/30 shadow-2xl text-sm focus:border-blue-500 focus:ring-blue-500 dark:bg-neutral-800 dark:border-neutral-700 dark:text-neutral-400 dark:placeholder-neutral-500 dark:focus:ring-neutral-600" required />
                </div>

                <div>
                  <label htmlFor="password" className="block text-sm mb-2 dark:text-white">{t('auth.password')}</label>
                  <input type="password" id="password" name="password" value={formData.password} onChange={handleChange} className="py-3 px-4 block w-full border-gray-200 rounded-full bg-white/30 shadow-2xl text-sm focus:border-blue-500 focus:ring-blue-500 dark:bg-neutral-800 dark:border-neutral-700 dark:text-neutral-400 dark:placeholder-neutral-500 dark:focus:ring-neutral-600" required />
                </div>

                <div>
                  <label htmlFor="confirmPassword" className="block text-sm mb-2 dark:text-white">{t('auth.confirm_password')}</label>
                  <input type="password" id="confirmPassword" name="confirmPassword" value={formData.confirmPassword} onChange={handleChange} className="py-3 px-4 block w-full border-gray-200 rounded-full bg-white/30 shadow-2xl text-sm focus:border-blue-500 focus:ring-blue-500 dark:bg-neutral-800 dark:border-neutral-700 dark:text-neutral-400 dark:placeholder-neutral-500 dark:focus:ring-neutral-600" required />
                </div>

                {error && <p className="text-xs text-red-600 mt-2">{error}</p>}
                {success && <p className="text-xs text-green-600 mt-2">{success}</p>}

                <button type="submit" disabled={loading} className="w-full relative inline-flex justify-center items-center gap-x-3 text-center bg-gradient-to-r from-blue-600 via-violet-600 to-blue-600 bg-[length:200%_auto] text-white text-sm font-semibold rounded-full hover:shadow-lg hover:bg-right active:scale-95 transition-all duration-500 py-3 px-6 shadow-lg shadow-blue-500/30 disabled:opacity-50 disabled:pointer-events-none">
                  <span className={loading ? 'invisible' : ''}>{t('auth.signup_btn')}</span>
                  {loading && (
                    <div className="absolute inset-0 flex items-center justify-center gap-x-3">
                      <svg className="animate-spin h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                      </svg>
                      {t('auth.processing', 'Processing...')}
                    </div>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      </main>

      <Footer />
    </div>
  );
};

export default Register;