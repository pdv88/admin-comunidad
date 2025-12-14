import React from 'react'
import { useTranslation } from 'react-i18next';
import { Link } from 'react-router-dom';
import { FadeIn, StaggerContainer, StaggerItem } from '../AnimationWrapper';

function Features() {
  const { t } = useTranslation();

  const features = [
    {
      title: t('features.voting.title', 'Secure Voting'),
      desc: t('features.voting.desc', 'Make decisions democratically with secure, transparent digital voting.'),
      icon: (
        <svg className="flex-shrink-0 size-6 text-white" xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M9 12h6"/><path d="M12 9v6"/><path d="M3 5h18"/><path d="M5 5v14a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V5"/></svg>
      ),
      bg: "bg-blue-600/50",
      link: "/app/voting"
    },
    {
      title: t('features.payments.title', 'Transparent Finances'),
      desc: t('features.payments.desc', 'Track monthly fees, campaign contributions, and community expenses.'),
      icon: (
        <svg className="flex-shrink-0 size-6 text-white" xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect width="20" height="14" x="2" y="5" rx="2"/><line x1="2" x2="22" y1="10" y2="10"/></svg>
      ),
      bg: "bg-purple-600/50",
       link: "/app/payments"
    },
    {
      title: t('features.notices.title', 'Instant Notices'),
      desc: t('features.notices.desc', 'Stay updated with real-time alerts for meetings, repairs, and news.'),
      icon: (
        <svg className="flex-shrink-0 size-6 text-white" xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M6 8a6 6 0 0 1 12 0c0 7 3 9 3 9H3s3-2 3-9"/><path d="M10.3 21a1.94 1.94 0 0 0 3.4 0"/></svg>
      ),
      bg: "bg-indigo-600/50",
       link: "/app/notices"
    },
    {
      title: t('features.reports.title', 'Easy Reporting'),
      desc: t('features.reports.desc', 'Report maintenance issues directly from your phone and track their status.'),
      icon: (
        <svg className="flex-shrink-0 size-6 text-white" xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M14.7 6.3a1 1 0 0 0 0 1.4l1.6 1.6a1 1 0 0 0 1.4 0l3.77-3.77a6 6 0 0 1-7.94 7.94l-6.91 6.91a2.12 2.12 0 0 1-3-3l6.91-6.91a6 6 0 0 1 7.94-7.94l-3.76 3.76z"/></svg>
      ),
      bg: "bg-pink-600/50",
       link: "/app/reports"
    }
  ];

  return (
    <div className="max-w-[85rem] px-4 py-10 sm:px-6 lg:px-8 lg:py-14 mx-auto" id="features">
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-10 items-center">
        
        {/* Intro */}
         <FadeIn className="space-y-6 sm:space-y-8">
            <h2 className="font-bold text-3xl lg:text-4xl text-gray-700 dark:text-neutral-200">
               {t('features.main_title', 'Everything you need to manage your community')}
            </h2>
            <p className="text-gray-500 dark:text-neutral-500 text-lg">
               {t('features.main_desc', 'Experience a platform designed to bring neighbors together and make administrative tasks effortless.')}
            </p>
            
            <ul className="space-y-4">
               {[
                  t('features.benefit1', 'Reduce delinquency with automated reminders'),
                  t('features.benefit2', 'Increase participation in community decisions'),
                  t('features.benefit3', 'Transparent and auditable record keeping')
               ].map((item, idx) => (
                  <li key={idx} className="flex space-x-3">
                     <span className="mt-0.5 size-5 flex justify-center items-center rounded-full bg-blue-50 text-blue-600 dark:bg-blue-800/30 dark:text-blue-500">
                      <svg className="flex-shrink-0 size-3.5" xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"/></svg>
                    </span>
                    <span className="text-sm sm:text-base text-gray-500 dark:text-neutral-500">{item}</span>
                  </li>
               ))}
            </ul>
         </FadeIn>

         {/* Bento Grid */}
         <StaggerContainer className="grid grid-cols-1 sm:grid-cols-2 gap-6">
            {features.map((feature, idx) => (
               <StaggerItem key={idx}>
                 <Link to={feature.link} className="group flex flex-col h-full bg-white/20 backdrop-blur-md border border-gray-200/50 shadow-sm rounded-xl p-5 dark:bg-neutral-900/60 dark:border-neutral-700/50 hover:shadow-xl transition-all duration-300">
                    <div className={`flex justify-center items-center size-10 rounded-lg ${feature.bg} mb-4`}>
                       {feature.icon}
                    </div>
                    <h3 className="text-lg font-bold text-gray-700 dark:text-gray-200 group-hover:text-blue-600 dark:group-hover:text-blue-400">
                       {feature.title}
                    </h3>
                    <p className="mt-2 text-gray-500 dark:text-neutral-400 text-sm">
                       {feature.desc}
                    </p>
                    <span className="mt-4 inline-flex items-center gap-x-1.5 text-blue-600 decoration-2 group-hover:underline font-medium text-sm">
                       {t('common.learn_more', 'Learn more')}
                       <svg className="flex-shrink-0 size-4" xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m9 18 6-6-6-6"/></svg>
                    </span>
                 </Link>
               </StaggerItem>
            ))}
         </StaggerContainer>

      </div>
    </div>
  )
}

export default Features