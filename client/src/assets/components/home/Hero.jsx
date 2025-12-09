import React from 'react'
import { useTranslation } from 'react-i18next';

function Hero() {
  const { t } = useTranslation();

  return (
    <div className="max-w-[85rem] mx-auto px-4 sm:px-6 lg:px-8 pt-12 md:pt-24 pb-10">
      {/* <!-- Grid --> */}
      <div className="grid md:grid-cols-2 gap-4 md:gap-8 xl:gap-20 md:items-center">
        <div>
          <h1 className="block text-3xl font-bold text-gray-800 sm:text-4xl lg:text-6xl lg:leading-tight dark:text-white">
            {t('hero.title').split(" ").map((word, i) => 
               i === 0 ? <span key={i} className="block text-indigo-600">{word}</span> : word + " "
            )}
          </h1>
          <p className="mt-3 text-lg text-gray-800 dark:text-neutral-400">
            {t('hero.subtitle')}
          </p>

          {/* <!-- Buttons --> */}
          <div className="mt-7 grid gap-3 w-full sm:inline-flex">
            <a className="py-3 px-4 inline-flex justify-center items-center gap-x-2 text-sm font-semibold rounded-lg border border-transparent bg-indigo-600 text-white hover:bg-indigo-700 disabled:opacity-50 disabled:pointer-events-none" href="/register">
              {t('hero.cta_primary')}
              <svg className="flex-shrink-0 size-4" xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m9 18 6-6-6-6"/></svg>
            </a>
            <a className="py-3 px-4 inline-flex justify-center items-center gap-x-2 text-sm font-medium rounded-lg border border-gray-200 bg-white text-gray-800 shadow-sm hover:bg-gray-50 disabled:opacity-50 disabled:pointer-events-none dark:bg-neutral-900 dark:border-neutral-700 dark:text-white dark:hover:bg-neutral-800" href="#">
              {t('hero.cta_secondary')}
            </a>
          </div>
          {/* <!-- End Buttons --> */}

          {/* <!-- Review --> */}
          <div className="mt-6 lg:mt-10 grid grid-cols-2 gap-x-5">
            {/* <!-- Review --> */}
            <div className="py-5">
              <div className="flex space-x-1">
                 {[...Array(5)].map((_, i) => (
                    <svg key={i} className="size-4 text-indigo-600" width="16" height="16" viewBox="0 0 16 16" fill="currentColor" xmlns="http://www.w3.org/2000/svg">
                      <path d="M3.612 15.443c-.386.198-.824-.149-.746-.592l.83-4.73L.173 6.765c-.329-.314-.158-.888.283-.95l4.898-.696L7.538.792c.197-.39.73-.39.927 0l2.184 4.327 4.898.696c.441.062.612.636.282.95l-3.522 3.356.83 4.73c.078.443-.36.79-.746.592L8 13.187l-4.389 2.256z"/>
                    </svg>
                 ))}
              </div>

              <p className="mt-3 text-sm text-gray-800 dark:text-neutral-200">
                <span className="font-bold">4.8</span> /5 - 5k reviews
              </p>
            </div>
            {/* <!-- End Review --> */}
          </div>
          {/* <!-- End Review --> */}
        </div>
        {/* <!-- End Col --> */}

        <div className="relative ms-4">
          <img className="w-full rounded-md shadow-xl" src="https://images.unsplash.com/photo-1560518883-ce09059eeffa?ixlib=rb-4.0.3&ixid=MnwxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8&auto=format&fit=crop&w=1073&q=80" alt="Apartment Building" />
          <div className="absolute inset-0 -z-[1] bg-gradient-to-tr from-indigo-200 via-white/0 to-white/0 size-full rounded-md mt-4 -mb-4 me-4 -ms-4 lg:mt-6 lg:-mb-6 lg:me-6 lg:-ms-6 dark:from-neutral-800 dark:via-neutral-900/0 dark:to-neutral-900/0"></div>
        </div>
        {/* <!-- End Col --> */}
      </div>
      {/* <!-- End Grid --> */}
    </div>
  )
}

export default Hero