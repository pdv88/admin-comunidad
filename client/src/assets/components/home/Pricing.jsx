import React, { useState } from 'react'
import { useTranslation } from 'react-i18next';
import { Link } from 'react-router-dom';
import { FadeIn, StaggerContainer, StaggerItem } from '../AnimationWrapper';

function Pricing() {
  const [isAnnual, setIsAnnual] = useState(false)
  const { t } = useTranslation();

  return (
    <div className="max-w-[85rem] px-4 py-10 sm:px-6 lg:px-8 lg:py-14 mx-auto" id="pricing">
      {/* Title */}
      <FadeIn className="max-w-2xl mx-auto text-center mb-10 lg:mb-14">
        <h2 className="text-2xl font-bold md:text-4xl md:leading-tight dark:text-white">
           {t('pricing.title', 'Pricing')}
        </h2>
        <p className="mt-1 text-gray-600 dark:text-neutral-400">
           {t('pricing.subtitle', 'Choose the plan that fits your community size.')}
        </p>
      </FadeIn>

       {/* Toggle Switch */}
       <FadeIn delay={0.2} className="flex justify-center items-center mb-12">
           <span className={`text-sm ${!isAnnual ? 'font-semibold text-gray-900 dark:text-white' : 'text-gray-500'}`}>{t('pricing.monthly', 'Monthly')}</span>
           <button 
             onClick={() => setIsAnnual(!isAnnual)}
             className={`relative mx-4 w-14 h-7 rounded-full transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 dark:focus:ring-offset-gray-900 ${isAnnual ? 'bg-blue-600' : 'bg-gray-200 dark:bg-neutral-700'}`}
           >
              <span className={`absolute left-1 top-1 w-5 h-5 rounded-full bg-white transition-transform duration-200 ease-in-out shadow-sm ${isAnnual ? 'translate-x-7' : 'translate-x-0'}`}></span>
           </button>
           <span className={`text-sm ${isAnnual ? 'font-semibold text-gray-900 dark:text-white' : 'text-gray-500'}`}>
              {t('pricing.annual', 'Annual')}
              <span className="ms-2 inline-block whitespace-nowrap text-[10px] uppercase font-bold text-green-600 bg-green-100 dark:text-green-400 dark:bg-green-900/30 px-2 py-0.5 rounded-full">
                 -15%
              </span>
           </span>
       </FadeIn>

      <StaggerContainer className="grid grid-cols-1 md:grid-cols-3 gap-6 lg:gap-8">
        {/* Basic Plan */}
        <StaggerItem className="flex flex-col border border-gray-200/50 text-center rounded-2xl p-8 dark:border-neutral-700/50 bg-white/40 backdrop-blur-xl dark:bg-neutral-900/60 hover:shadow-xl transition-shadow duration-300">
           <h4 className="font-medium text-lg text-gray-700 dark:text-neutral-200">{t('pricing.basic.title', 'Basic')}</h4>
           <div className="mt-5 flex justify-center items-baseline gap-x-1">
             <span className="text-4xl font-bold text-gray-700 dark:text-neutral-200">
               {isAnnual ? '€29' : '€35'}
             </span>
             <span className="text-gray-500 dark:text-neutral-500">/mo</span>
           </div>
           
           <ul className="mt-7 space-y-4 text-sm text-start">
             <li className="flex gap-x-3">
               <CheckIcon />
               <span className="text-gray-800 dark:text-neutral-200">{t('pricing.plan_features.units_20')}</span>
             </li>
              <li className="flex gap-x-3">
               <CheckIcon />
               <span className="text-gray-800 dark:text-neutral-200">{t('pricing.plan_features.basic_reports')}</span>
             </li>
              <li className="flex gap-x-3">
               <CheckIcon />
               <span className="text-gray-800 dark:text-neutral-200">{t('pricing.plan_features.community_board')}</span>
             </li>
           </ul>

           <Link to="/register" className="mt-auto py-3 px-4 w-full inline-flex justify-center items-center gap-x-2 text-sm font-semibold border border-transparent bg-gradient-to-r from-blue-600 via-violet-600 to-blue-600 bg-[length:200%_auto] text-white hover:shadow-lg hover:bg-right transition-all duration-500 rounded-full">
              {t('pricing.basic.btn', 'Start Free Trial')}
           </Link>
        </StaggerItem>

        {/* Pro Plan (Gradient) */}
        <StaggerItem className="relative flex flex-col text-center rounded-2xl p-8 bg-gradient-to-br from-violet-600 to-blue-600/40 text-white shadow-xl scale-105 z-10">
            <div className="absolute top-0 right-0 p-4">
               <span className="inline-flex items-center gap-x-1.5 py-1.5 px-3 rounded-lg text-xs font-bold uppercase tracking-wide text-blue-600 bg-white shadow-sm">
                  {t('pricing.most_popular')}
               </span>
            </div>
            
           <h4 className="font-medium text-lg text-white/90">{t('pricing.pro.title', 'Professional')}</h4>
           <div className="mt-5 flex justify-center items-baseline gap-x-1">
             <span className="text-5xl font-bold text-white">
               {isAnnual ? '€79' : '€95'}
             </span>
             <span className="text-white/70">/mo</span>
           </div>
           
           <ul className="mt-7 space-y-4 text-sm text-start">
             <li className="flex gap-x-3 text-white/90">
               <CheckIcon className="text-white" />
               <span>{t('pricing.plan_features.units_100')}</span>
             </li>
              <li className="flex gap-x-3 text-white/90">
               <CheckIcon className="text-white" />
               <span>{t('pricing.plan_features.voting')}</span>
             </li>
              <li className="flex gap-x-3 text-white/90">
               <CheckIcon className="text-white" />
               <span>{t('pricing.plan_features.payment_gateway')}</span>
             </li>
             <li className="flex gap-x-3 text-white/90">
               <CheckIcon className="text-white" />
               <span>{t('pricing.plan_features.priority_support')}</span>
             </li>
           </ul>

           <Link to="/register" className="mt-auto py-3 px-4 w-full inline-flex justify-center items-center gap-x-2 text-sm font-bold border border-transparent bg-white text-blue-600 hover:bg-gray-100 disabled:opacity-50 disabled:pointer-events-none shadow-md rounded-full transition-colors">
              {t('pricing.pro.btn', 'Get Started')}
           </Link>
        </StaggerItem>

        {/* Enterprise */}
        <StaggerItem className="flex flex-col border border-gray-200/50 text-center rounded-2xl p-8 dark:border-neutral-700/50 bg-white/40 backdrop-blur-xl dark:bg-neutral-900/60 hover:shadow-xl transition-shadow duration-300">
           <h4 className="font-medium text-lg text-gray-700 dark:text-neutral-200">{t('pricing.enterprise.title', 'Enterprise')}</h4>
           <div className="mt-5 flex justify-center items-baseline gap-x-1">
             <span className="text-4xl font-bold text-gray-700 dark:text-neutral-200">
               {t('pricing.enterprise.custom', 'Custom')}
             </span>
           </div>
           
           <ul className="mt-7 space-y-4 text-sm text-start">
             <li className="flex gap-x-3">
               <CheckIcon />
               <span className="text-gray-700 dark:text-neutral-200">{t('pricing.plan_features.unlimited_units')}</span>
             </li>
              <li className="flex gap-x-3">
               <CheckIcon />
               <span className="text-gray-700 dark:text-neutral-200">{t('pricing.plan_features.multi_community')}</span>
             </li>
              <li className="flex gap-x-3">
               <CheckIcon />
               <span className="text-gray-700 dark:text-neutral-200">{t('pricing.plan_features.dedicated_manager')}</span>
             </li>
           </ul>

           <button className="mt-auto py-3 px-4 w-full inline-flex justify-center items-center gap-x-2 text-sm font-semibold border border-transparent bg-gradient-to-r from-blue-600 via-violet-600 to-blue-600 bg-[length:200%_auto] text-white hover:shadow-lg hover:bg-right transition-all duration-500 rounded-full">
              {t('pricing.enterprise.btn', 'Contact Sales')}
           </button>
        </StaggerItem>

      </StaggerContainer>
    </div>
  )
}

function CheckIcon({ className = "text-blue-600 dark:text-blue-500" }) {
    return (
        <svg className={`flex-shrink-0 size-4 mt-0.5 ${className}`} xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"/></svg>
    )
}

export default Pricing