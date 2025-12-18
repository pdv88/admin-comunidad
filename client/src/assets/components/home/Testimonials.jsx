import React from 'react'
import { useTranslation } from 'react-i18next';
import { FadeIn, StaggerContainer, StaggerItem } from '../AnimationWrapper';

function Testimonials() {
  const { t } = useTranslation();

  const testimonials = [
      {
          quote: t('testimonials.t1.quote', "Since switching to this platform, our community meetings are shorter and more productive. The voting system is a game changer."),
          author: "Maria Gonzalez",
          role: t('testimonials.roles.president', "Community President"),
          avatar: "https://images.unsplash.com/photo-1494790108377-be9c29b29330?ixlib=rb-1.2.1&ixid=eyJhcHBfaWQiOjEyMDd9&auto=format&fit=facearea&facepad=2&w=256&h=256&q=80"
      },
      {
          quote: t('testimonials.t2.quote', "I love being able to pay my fees from my phone. No more bank transfers or lost receipts!"),
          author: "Carlos Rodriguez",
          role: t('testimonials.roles.resident', "Resident"),
          avatar: "https://images.unsplash.com/photo-1519244703995-f4e0f30006d5?ixlib=rb-1.2.1&ixid=eyJhcHBfaWQiOjEyMDd9&auto=format&fit=facearea&facepad=2&w=256&h=256&q=80"
      },
      {
          quote: t('testimonials.t3.quote', "Reporting maintenance issues is so easy now. I take a photo, upload it, and it gets fixed."),
          author: "Sarah Johnson",
          role: t('testimonials.roles.resident', "Resident"),
          avatar: "https://images.unsplash.com/photo-1506794778202-cad84cf45f1d?ixlib=rb-1.2.1&ixid=eyJhcHBfaWQiOjEyMDd9&auto=format&fit=facearea&facepad=2&w=256&h=256&q=80"
      } 
  ];

  return (
    <div className="max-w-[85rem] px-4 py-10 sm:px-6 lg:px-8 lg:py-14 mx-auto">
      {/* Title */}
      <FadeIn className="max-w-2xl mx-auto text-center mb-10 lg:mb-14">
        <h2 className="text-2xl font-bold md:text-4xl md:leading-tight dark:text-white">
          {t('testimonials.title', 'Trusted by Communities Everywhere')}
        </h2>
        <p className="mt-1 text-gray-600 dark:text-neutral-400">
          {t('testimonials.subtitle', 'See what presidents and residents are saying.')}
        </p>
      </FadeIn>

      {/* Grid */}
      <StaggerContainer className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
        {testimonials.map((item, idx) => (
            <StaggerItem key={idx} className="flex flex-col bg-white/20 backdrop-blur-xl border border-gray-200/50 shadow-sm rounded-xl p-8 dark:bg-neutral-900/60 dark:border-neutral-700/50">
                <div className="flex-auto">
                    <p className="text-gray-700 dark:text-neutral-200 text-lg italic">
                        "{item.quote}"
                    </p>
                </div>

                <div className="mt-6 flex items-center gap-x-4">
                    <img className="size-10 rounded-full" src={item.avatar} alt={item.author} />
                    <div>
                        <h3 className="text-sm font-semibold text-gray-800 dark:text-white">{item.author}</h3>
                        <p className="text-sm text-gray-500 dark:text-neutral-500">{item.role}</p>
                    </div>
                </div>
            </StaggerItem>
        ))}
      </StaggerContainer>

       {/* Stats Section */}
       <FadeIn delay={0.4} className="mt-20 grid grid-cols-2 md:grid-cols-4 gap-8 border-t border-gray-200 dark:border-neutral-700 pt-10">
          <div className="text-center">
              <h4 className="text-3xl md:text-4xl font-bold text-blue-600 dark:text-blue-500">45k+</h4>
              <p className="text-sm text-gray-500 dark:text-neutral-500 mt-2">{t('testimonials.stats.active_users')}</p>
          </div>
          <div className="text-center">
              <h4 className="text-3xl md:text-4xl font-bold text-blue-600 dark:text-blue-500">99%</h4>
              <p className="text-sm text-gray-500 dark:text-neutral-500 mt-2">{t('testimonials.stats.uptime')}</p>
          </div>
           <div className="text-center">
              <h4 className="text-3xl md:text-4xl font-bold text-blue-600 dark:text-blue-500">€2M+</h4>
              <p className="text-sm text-gray-500 dark:text-neutral-500 mt-2">{t('testimonials.stats.processed')}</p>
          </div>
           <div className="text-center">
              <h4 className="text-3xl md:text-4xl font-bold text-blue-600 dark:text-blue-500">500+</h4>
              <p className="text-sm text-gray-500 dark:text-neutral-500 mt-2">{t('testimonials.stats.communities')}</p>
          </div>
       </FadeIn>
    </div>
  )
}

export default Testimonials