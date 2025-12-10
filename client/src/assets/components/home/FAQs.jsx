import React from 'react'
import { useTranslation } from 'react-i18next';

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
    <>
    {/* <!-- FAQ --> */}
<div className="max-w-[85rem] px-4 py-10 sm:px-6 lg:px-8 lg:py-14 mx-auto">
  {/* <!-- Grid --> */}
  <div className="grid md:grid-cols-5 gap-10">
    <div className="md:col-span-2">
      <div className="max-w-xs">
        <h2 className="text-2xl font-bold md:text-4xl md:leading-tight dark:text-white">
            {t('faqs.title').split(" ").map((word, i) => (
              <React.Fragment key={i}>
                {word} {i === 1 && <br/>} {!((i === 1) || (i === t('faqs.title').split(" ").length - 1)) && " "}
              </React.Fragment>
            ))}
        </h2>
        <p className="mt-1 hidden md:block text-gray-600 dark:text-neutral-400">
            {t('faqs.subtitle')}
        </p>
      </div>
    </div>
    {/* <!-- End Col --> */}

    <div className="md:col-span-3">
      {/* <!-- Accordion --> */}
      <div className="hs-accordion-group divide-y divide-gray-200 dark:divide-neutral-700">
        {faqs.map((faq, index) => (
          <div 
            key={faq.id} 
            className={`hs-accordion pt-6 pb-3 ${activeIndex === index ? 'active' : ''}`} 
            id={`hs-basic-with-title-and-arrow-stretched-heading-${faq.id}`}
          >
            <button 
              className="hs-accordion-toggle group pb-3 inline-flex items-center justify-between gap-x-3 w-full md:text-lg font-semibold text-start text-gray-800 rounded-lg transition hover:text-gray-500 dark:text-neutral-200 dark:hover:text-neutral-400" 
              aria-controls={`hs-basic-with-title-and-arrow-stretched-collapse-${faq.id}`}
              onClick={() => toggleAccordion(index)}
            >
              {t(faq.q)}
              {activeIndex !== index ? (
                <svg className="block flex-shrink-0 size-5 text-gray-600 group-hover:text-gray-500 dark:text-neutral-400" xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m6 9 6 6 6-6"/></svg>
              ) : (
                <svg className="block flex-shrink-0 size-5 text-gray-600 group-hover:text-gray-500 dark:text-neutral-400" xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m18 15-6-6-6 6"/></svg>
              )}
            </button>
            <div 
              id={`hs-basic-with-title-and-arrow-stretched-collapse-${faq.id}`} 
              className={`hs-accordion-content w-full overflow-hidden transition-[height] duration-300 ${activeIndex === index ? 'block' : 'hidden'}`} 
              aria-labelledby={`hs-basic-with-title-and-arrow-stretched-heading-${faq.id}`}
            >
              <p className="text-gray-600 dark:text-neutral-400">
                {t(faq.a)}
              </p>
            </div>
          </div>
        ))}
      </div>
      {/* <!-- End Accordion --> */}
    </div>
    {/* <!-- End Col --> */}
  </div>
  {/* <!-- End Grid --> */}
</div>
{/* <!-- End FAQ --> */}
    </>
  )
}

export default FAQs