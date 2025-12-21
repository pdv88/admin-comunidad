import React from 'react';
import { useTranslation } from 'react-i18next';
import Footer from '../assets/components/Footer';
import Header from '../assets/components/Header';

const PrivacyPolicy = () => {
  const { t } = useTranslation();

  return (
    <div className="relative flex flex-col min-h-screen">
      <Header />
      <main className="flex-grow container mx-auto px-4 pt-24 pb-12 max-w-4xl">
        <div className="bg-white/40 backdrop-blur-md border border-gray-200 rounded-3xl p-8 md:p-12 shadow-lg dark:bg-neutral-900/40 dark:border-neutral-700">
          <h1 className="text-3xl md:text-4xl font-bold mb-8 text-gray-700 dark:text-neutral-200">Privacy Policy</h1>
          
          <div className="prose dark:prose-invert max-w-none space-y-6 text-gray-600 dark:text-neutral-400">
            <p>Last updated: {new Date().toLocaleDateString()}</p>
            
            <section>
              <h2 className="text-xl font-semibold mb-3 text-gray-700 dark:text-neutral-200">1. Introduction</h2>
              <p>
                Welcome to Habiio. We respect your privacy and are committed to protecting your personal data. 
                This privacy policy will inform you as to how we look after your personal data when you visit our website 
                and tell you about your privacy rights and how the law protects you.
              </p>
            </section>

            <section>
              <h2 className="text-xl font-semibold mb-3 text-gray-700 dark:text-neutral-200">2. Data We Collect</h2>
              <p>
                We may collect, use, store and transfer different kinds of personal data about you which we have grouped together follows:
              </p>
              <ul className="list-disc pl-5 mt-2 space-y-1">
                <li>Identity Data (name, username)</li>
                <li>Contact Data (email address, telephone number)</li>
                <li>Technical Data (IP address, browser type)</li>
                <li>Usage Data (how you use our website)</li>
              </ul>
            </section>

            <section>
              <h2 className="text-xl font-semibold mb-3 text-gray-700 dark:text-neutral-200">3. How We Use Your Data</h2>
              <p>
                We will only use your personal data when the law allows us to. Most commonly, we will use your personal data in the following circumstances:
              </p>
               <ul className="list-disc pl-5 mt-2 space-y-1">
                <li>Where we need to perform the contract we are about to enter into or have entered into with you.</li>
                <li>Where it is necessary for our legitimate interests.</li>
                <li>Where we need to comply with a legal or regulatory obligation.</li>
              </ul>
            </section>

             <section>
              <h2 className="text-xl font-semibold mb-3 text-gray-700 dark:text-neutral-200">4. Contact Us</h2>
              <p>
                If you have any questions about this privacy policy, please contact us.
              </p>
            </section>
          </div>
        </div>
      </main>
      <Footer />
    </div>
  );
};

export default PrivacyPolicy;
