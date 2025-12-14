import React from 'react'
import { useTranslation } from 'react-i18next';
import { FadeIn, StaggerContainer, StaggerItem } from '../AnimationWrapper';

function FAQs() {
  const { t } = useTranslation();
  const [activeIndex, setActiveIndex] = React.useState(0);

  const faqs = [
    { id: 1, q: 'faqs.q1', a: 'faqs.a1' },
    { id: 2, q: 'faqs.q2', a: 'faqs.a2' },
    { id: 3, q: 'faqs.q3', a: 'faqs.a3' },
    { id: 4, q: 'faqs.q4', a: 'faqs.a4' },
  ];

  const toggleAccordion = (index) => {
    setActiveIndex(activeIndex === index ? null : index);
  };

  return (
    <div className="max-w-[85rem] px-4 py-10 sm:px-6 lg:px-8 lg:py-14 mx-auto my-10 relative">
      
      <div className="grid md:grid-cols-5 gap-10">
        <div className="md:col-span-2">
          <FadeIn className="max-w-xs sticky top-24">
             <h2 className="text-2xl font-bold md:text-3xl md:leading-tight dark:text-white bg-clip-text text-transparent bg-gradient-to-r from-violet-600 to-blue-600 dark:from-violet-400 dark:to-blue-400">
               {t('faqs.title', 'Frequently Asked Questions')}
             </h2>
            <p className="mt-2 hidden md:block text-gray-600 dark:text-neutral-400">
               {t('faqs.subtitle', 'Answers to the most common questions about our platform.')}
            </p>
          </FadeIn>
        </div>

        <div className="md:col-span-3">
          <StaggerContainer className="hs-accordion-group space-y-4">
            {faqs.map((faq, index) => (
              <StaggerItem 
                key={faq.id} 
                className={`hs-accordion bg-white/20 dark:bg-neutral-800/60 backdrop-blur-xl border border-white/40 dark:border-neutral-700/50 rounded-2xl p-6 transition-all duration-300 shadow-sm hover:shadow-lg ${activeIndex === index ? 'ring-1 ring-blue-500/30 shadow-md' : ''}`} 
                id={`faq-${faq.id}`}
              >
                <button 
                  className="hs-accordion-toggle group inline-flex items-center justify-between gap-x-3 w-full md:text-lg font-semibold text-start text-gray-800 dark:text-neutral-200 rounded-lg transition" 
                  aria-controls={`faq-collapse-${faq.id}`}
                  onClick={() => toggleAccordion(index)}
                >
                  {t(faq.q)}
                  <span className={`block flex-shrink-0 size-8 text-gray-600 group-hover:text-blue-600 dark:text-neutral-400 transition-transform duration-300 ${activeIndex === index ? 'rotate-180 text-blue-600' : ''}`}>
                      <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth="2.5" stroke="currentColor" className="w-5 h-5">
                        <path strokeLinecap="round" strokeLinejoin="round" d="m19.5 8.25-7.5 7.5-7.5-7.5" />
                      </svg>
                  </span>
                </button>
                <div 
                  id={`faq-collapse-${faq.id}`} 
                  className={`hs-accordion-content w-full overflow-hidden transition-all duration-300 grid ${activeIndex === index ? 'grid-rows-[1fr] opacity-100 mt-4' : 'grid-rows-[0fr] opacity-0 mt-0'}`} 
                  aria-labelledby={`faq-${faq.id}`}
                >
                  <div className="min-h-0">
                    <p className="text-gray-600 dark:text-neutral-400 leading-relaxed">
                      {t(faq.a)}
                    </p>
                  </div>
                </div>
              </StaggerItem>
            ))}
          </StaggerContainer>
        </div>
      </div>
    </div>
  )
}

export default FAQs