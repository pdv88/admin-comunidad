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
          <h1 className="text-3xl md:text-4xl font-bold mb-8 text-gray-700 dark:text-neutral-200">Terms and Conditions</h1>
          
          <div className="prose dark:prose-invert max-w-none space-y-6 text-gray-600 dark:text-neutral-400">
             <p>Last updated: {new Date().toLocaleDateString()}</p>

            <section>
              <h2 className="text-xl font-semibold mb-3 text-gray-700 dark:text-neutral-200">1. Agreement to Terms</h2>
              <p>
                These Terms and Conditions constitute a legally binding agreement made between you, whether personally or on behalf of an entity ("you") and Habiio ("we," "us" or "our"), 
                concerning your access to and use of the website as well as any other media form, media channel, mobile website or mobile application related, linked, or otherwise connected thereto.
              </p>
            </section>

            <section>
              <h2 className="text-xl font-semibold mb-3 text-gray-700 dark:text-neutral-200">2. Intellectual Property Rights</h2>
              <p>
                Unless otherwise indicated, the Site is our proprietary property and all source code, databases, functionality, software, website designs, audio, video, text, photographs, and graphics on the Site 
                and the trademarks, service marks, and logos contained therein are owned or controlled by us or licensed to us.
              </p>
            </section>

            <section>
              <h2 className="text-xl font-semibold mb-3 text-gray-700 dark:text-neutral-200">3. User Representations</h2>
              <p>
               By using the Site, you represent and warrant that: (1) all registration information you submit will be true, accurate, current, and complete; 
               (2) you will maintain the accuracy of such information and promptly update such registration information as necessary.
              </p>
            </section>

             <section>
              <h2 className="text-xl font-semibold mb-3 text-gray-700 dark:text-neutral-200">4. Modifications and Interruptions</h2>
              <p>
                We reserve the right to change, modify, or remove the contents of the Site at any time or for any reason at our sole discretion without notice. 
                However, we have no obligation to update any information on our Site.
              </p>
            </section>
          </div>
        </div>
      </main>
      <Footer />
    </div>
  );
};

export default Terms;
