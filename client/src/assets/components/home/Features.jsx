import React from 'react'
import { useTranslation } from 'react-i18next';
import featureMeeting from '../../images/feature_meeting.png'
import featureApp from '../../images/feature_app.png'
import featureMaintenance from '../../images/feature_maintenance.png'

function Features() {
  const { t } = useTranslation();

  return (
    <>
    {/* <!-- Features --> */}
<div className="max-w-[85rem] px-4 py-10 sm:px-6 lg:px-8 lg:py-14 mx-auto" id="features">
  {/* <!-- Grid --> */}
  <div className="lg:grid lg:grid-cols-12 lg:gap-16 lg:items-center">
    <div className="lg:col-span-7">
      {/* <!-- Grid --> */}
      <div className="grid grid-cols-12 gap-2 sm:gap-6 items-center lg:-translate-x-10">
        <div className="col-span-4">
          <img className="rounded-xl" src={featureMeeting} alt="Community Meeting"/>
        </div>
        {/* <!-- End Col --> */}

        <div className="col-span-3">
          <img className="rounded-xl" src={featureApp} alt="Management App"/>
        </div>
        {/* <!-- End Col --> */}

        <div className="col-span-5">
          <img className="rounded-xl" src={featureMaintenance} alt="Maintenance"/>
        </div>
        {/* <!-- End Col --> */}
      </div>
      {/* <!-- End Grid --> */}
    </div>
    {/* <!-- End Col --> */}

    <div className="mt-5 sm:mt-10 lg:mt-0 lg:col-span-5">
      <div className="space-y-6 sm:space-y-8">
        {/* <!-- Title --> */}
        <div className="space-y-2 md:space-y-4">
          <h2 className="font-bold text-3xl lg:text-4xl text-gray-800 dark:text-neutral-200">
            {t('features.title')}
          </h2>
          <p className="text-gray-500 dark:text-neutral-500">
            {t('features.description')}
          </p>
        </div>
        {/* <!-- End Title --> */}

        {/* <!-- List --> */}
        <ul className="space-y-2 sm:space-y-4">
          <li className="flex space-x-3">
            {/* <!-- Solid Check --> */}
            <span className="mt-0.5 size-5 flex justify-center items-center rounded-full bg-indigo-50 text-indigo-600 dark:bg-indigo-800/30 dark:text-indigo-500">
              <svg className="flex-shrink-0 size-3.5" xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"/></svg>
            </span>
            {/* <!-- End Solid Check --> */}

            <span className="text-sm sm:text-base text-gray-500 dark:text-neutral-500">
              {t('features.item1')}
            </span>
          </li>

          <li className="flex space-x-3">
            {/* <!-- Solid Check --> */}
            <span className="mt-0.5 size-5 flex justify-center items-center rounded-full bg-indigo-50 text-indigo-600 dark:bg-indigo-800/30 dark:text-indigo-500">
              <svg className="flex-shrink-0 size-3.5" xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"/></svg>
            </span>
            {/* <!-- End Solid Check --> */}

            <span className="text-sm sm:text-base text-gray-500 dark:text-neutral-500">
              {t('features.item2')}
            </span>
          </li>

          <li className="flex space-x-3">
            {/* <!-- Solid Check --> */}
            <span className="mt-0.5 size-5 flex justify-center items-center rounded-full bg-indigo-50 text-indigo-600 dark:bg-indigo-800/30 dark:text-indigo-500">
              <svg className="flex-shrink-0 size-3.5" xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"/></svg>
            </span>
            {/* <!-- End Solid Check --> */}

            <span className="text-sm sm:text-base text-gray-500 dark:text-neutral-500">
              {t('features.item3')}
            </span>
          </li>
        </ul>
        {/* <!-- End List --> */}
      </div>
    </div>
    {/* <!-- End Col --> */}
  </div>
  {/* <!-- End Grid --> */}
</div>
{/* <!-- End Features --> */}
    </>
  )
}

export default Features