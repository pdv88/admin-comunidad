import React from 'react';
import { useTranslation } from 'react-i18next';
import Footer from '../assets/components/Footer';
import Header from '../assets/components/Header';

const Terms = () => {
  const { t } = useTranslation();

  return (
    <div className="relative flex flex-col min-h-screen">
      <Header />
      <main className="flex-grow container mx-auto px-4 pt-24 pb-12 max-w-4xl">
        <div className="bg-white/40 backdrop-blur-md border border-gray-200 rounded-3xl p-8 md:p-12 shadow-lg dark:bg-neutral-900/40 dark:border-neutral-700">
          <h1 className="text-3xl md:text-4xl font-bold mb-8 text-gray-700 dark:text-neutral-200">{t('terms.title')}</h1>
          
          <div className="prose dark:prose-invert max-w-none space-y-6 text-gray-600 dark:text-neutral-400">
             <p>{t('terms.updated', { date: new Date().toLocaleDateString() })}</p>

            <section>
              <h2 className="text-xl font-semibold mb-3 text-gray-700 dark:text-neutral-200">{t('terms.section1.title')}</h2>
              <p>{t('terms.section1.content')}</p>
            </section>

            <section>
              <h2 className="text-xl font-semibold mb-3 text-gray-700 dark:text-neutral-200">{t('terms.section2.title')}</h2>
              <p>{t('terms.section2.content')}</p>
            </section>

            <section>
              <h2 className="text-xl font-semibold mb-3 text-gray-700 dark:text-neutral-200">{t('terms.section3.title')}</h2>
              <p>{t('terms.section3.content')}</p>
            </section>

             <section>
              <h2 className="text-xl font-semibold mb-3 text-gray-700 dark:text-neutral-200">{t('terms.section4.title')}</h2>
              <p>{t('terms.section4.content')}</p>
            </section>
          </div>
        </div>
      </main>
      <Footer />
    </div>
  );
};

export default Terms;
