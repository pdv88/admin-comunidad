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
    password: '',
    confirmPassword: '',
  });
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
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

    if (formData.password !== formData.confirmPassword) {
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
    }
  };

  return (
    <>
      <Header />
      <div className="flex bg-white dark:bg-neutral-900 border border-t border-gray-200 shadow-sm rounded-xl py-4 sm:px-7 dark:border-neutral-700 min-h-[calc(100vh-140px)] items-center justify-center my-10">
        <div className="mt-5 w-full max-w-md p-6 bg-white border border-gray-200 rounded-xl shadow-sm dark:bg-neutral-900 dark:border-neutral-700">
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
                  <label className="block text-sm mb-2 dark:text-white">{t('auth.fullname')}</label>
                  <input type="text" name="fullName" value={formData.fullName} onChange={handleChange} className="py-3 px-4 block w-full border-gray-200 rounded-lg text-sm focus:border-blue-500 focus:ring-blue-500 dark:bg-neutral-900 dark:border-neutral-700 dark:text-neutral-400" required />
                </div>

                <div>
                  <label className="block text-sm mb-2 dark:text-white">{t('auth.email')}</label>
                  <input type="email" name="email" value={formData.email} onChange={handleChange} className="py-3 px-4 block w-full border-gray-200 rounded-lg text-sm focus:border-blue-500 focus:ring-blue-500 dark:bg-neutral-900 dark:border-neutral-700 dark:text-neutral-400" required />
                </div>

                <div>
                  <label className="block text-sm mb-2 dark:text-white">{t('auth.password')}</label>
                  <input type="password" name="password" value={formData.password} onChange={handleChange} className="py-3 px-4 block w-full border-gray-200 rounded-lg text-sm focus:border-blue-500 focus:ring-blue-500 dark:bg-neutral-900 dark:border-neutral-700 dark:text-neutral-400" required />
                </div>

                <div>
                  <label className="block text-sm mb-2 dark:text-white">{t('auth.confirm_password')}</label>
                  <input type="password" name="confirmPassword" value={formData.confirmPassword} onChange={handleChange} className="py-3 px-4 block w-full border-gray-200 rounded-lg text-sm focus:border-blue-500 focus:ring-blue-500 dark:bg-neutral-900 dark:border-neutral-700 dark:text-neutral-400" required />
                </div>

                {error && <p className="text-xs text-red-600 mt-2">{error}</p>}
                {success && <p className="text-xs text-green-600 mt-2">{success}</p>}

                <button type="submit" className="w-full py-3 px-4 inline-flex justify-center items-center gap-x-2 text-sm font-semibold rounded-lg border border-transparent bg-blue-600 text-white hover:bg-blue-700 disabled:opacity-50 disabled:pointer-events-none">{t('auth.signup_btn')}</button>
              </div>
            </form>
          </div>
        </div>
      </div>
      <Footer />
    </>
  );
};

export default Register;