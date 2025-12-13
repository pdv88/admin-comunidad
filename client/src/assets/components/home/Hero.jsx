import React from 'react'
import { useTranslation } from 'react-i18next';
import { Link } from 'react-router-dom';

function Hero() {
  const { t } = useTranslation();

  return (
    <div className="relative overflow-hidden">
      <div className="relative z-10 max-w-[85rem] mx-auto px-4 sm:px-6 lg:px-8 pt-32 pb-10 lg:pt-48 lg:pb-16">
        <div className="max-w-2xl text-center mx-auto">
          <p className="inline-block text-sm font-medium bg-clip-text bg-gradient-to-l from-blue-600 to-violet-500 text-transparent dark:from-blue-400 dark:to-violet-400">
             ✨ Smart Community Management
          </p>

          {/* Title */}
          <div className="mt-5 max-w-2xl">
            <h1 className="block font-semibold text-gray-700 text-4xl md:text-5xl lg:text-6xl dark:text-neutral-200">
               {t('hero.title') || 'The Modern Way to Manage Your Community'}
            </h1>
          </div>

          {/* Subtitle */}
          <div className="mt-5 max-w-3xl">
            <p className="text-lg text-gray-600 dark:text-neutral-400">
              {t('hero.subtitle') || 'Streamline voting, payments, and communication in one secure platform. Built for residents, trusted by presidents.'}
            </p>
          </div>

          {/* Buttons */}
          <div className="mt-8 gap-3 flex justify-center">
            <Link to="/register" className="inline-flex justify-center items-center gap-x-3 text-center bg-gradient-to-tl from-blue-600 to-violet-600 hover:from-blue-700 hover:to-violet-700 border border-transparent text-white text-sm font-medium rounded-full focus:outline-none focus:ring-1 focus:ring-gray-600 py-3 px-6 dark:focus:ring-offset-gray-800 transform hover:scale-105 transition-all shadow-lg shadow-blue-500/30">
              {t('hero.cta_primary') || 'Get Started'}
              <svg className="flex-shrink-0 size-4" xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m9 18 6-6-6-6"/></svg>
            </Link>
            <Link to="/login" className="inline-flex justify-center items-center gap-x-3 text-center bg-white hover:bg-gray-50 border border-gray-200 text-gray-700 text-sm font-medium rounded-full focus:outline-none focus:ring-1 focus:ring-gray-600 py-3 px-6 dark:bg-transparent dark:border-neutral-700 dark:text-neutral-300 dark:hover:bg-neutral-800">
               {t('common.login', 'Log In')}
            </Link>
          </div>

           {/* Metrics / Trust */}
           <div className="mt-12 grid grid-cols-2 sm:grid-cols-4 gap-8 opacity-80">
              <div className="flex flex-col items-center">
                  <span className="text-2xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-blue-600 to-violet-600">98%</span>
                  <span className="text-xs text-gray-500 uppercase tracking-wide">Satisfaction</span>
              </div>
              <div className="flex flex-col items-center">
                  <span className="text-2xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-blue-600 to-violet-600">24/7</span>
                  <span className="text-xs text-gray-500 uppercase tracking-wide">Availability</span>
              </div>
              <div className="flex flex-col items-center">
                  <span className="text-2xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-blue-600 to-violet-600">10k+</span>
                  <span className="text-xs text-gray-500 uppercase tracking-wide">Votes Cast</span>
              </div>
               <div className="flex flex-col items-center">
                  <span className="text-2xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-blue-600 to-violet-600">Secure</span>
                  <span className="text-xs text-gray-500 uppercase tracking-wide">Payments</span>
              </div>
           </div>
        </div>
      </div>
    </div>
  )
}

export default Hero