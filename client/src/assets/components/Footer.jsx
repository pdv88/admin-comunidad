import React from "react";
import { Link } from "react-router-dom";
import { useTranslation } from 'react-i18next';
import logo from '../logos/habiio_logo_header_nobg.webp';

function Footer() {
  const { t } = useTranslation();

  return (
    <>
      <footer className="mt-auto w-[95%] lg:w-[80%] pt-10 pb-0 px-4 sm:px-6 lg:px-8 mx-auto relative z-20">
        <div className="bg-white/60 backdrop-blur-xl border border-white/20 rounded-t-3xl p-10 dark:bg-neutral-900/60 dark:border-neutral-700/50 shadow-sm">
          {/* <!-- Grid --> */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
            
            {/* Col 1: Logo */}
            <div className="flex flex-col items-center md:items-start">
              <Link
                className="flex-none text-xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-blue-600 to-violet-600 dark:from-blue-400 dark:to-violet-400"
                to="/"
                aria-label="Brand"
              >
                <img src={logo} alt="Habiio" className="h-20 w-auto drop-shadow-[0_0_1px_rgba(255,255,255,0.8)_0_0_10px_rgba(0,0,0,0.2)]" />
              </Link>
            </div>

            {/* Col 2: Legal Pages */}
            <div className="flex flex-col items-center md:items-start gap-4">
               <h4 className="text-xs font-bold text-gray-400 dark:text-gray-500 uppercase tracking-widest">{t('footer.legal', 'Legal')}</h4>
               <div className="flex flex-col gap-2 text-center md:text-left">
                  <Link
                    className="text-sm font-medium text-gray-500 hover:text-blue-600 dark:text-neutral-400 dark:hover:text-blue-400 transition-colors"
                    to="/privacy-policy"
                  >
                    {t('footer.privacy', 'Privacy Policy')}
                  </Link>
                  <Link
                    className="text-sm font-medium text-gray-500 hover:text-blue-600 dark:text-neutral-400 dark:hover:text-blue-400 transition-colors"
                    to="/terms-and-conditions"
                  >
                     {t('footer.terms', 'Terms & Conditions')}
                  </Link>
               </div>
            </div>

            {/* Col 3: Contact */}
            <div className="flex flex-col items-center md:items-start gap-4">
                 <h4 className="text-xs font-bold text-gray-400 dark:text-gray-500 uppercase tracking-widest">{t('footer.contact', 'Contact')}</h4>
                  <div className="flex flex-col gap-1 text-center md:text-left">
                    <a href="mailto:info@habiio.com" className="text-sm font-medium text-gray-500 hover:text-blue-600 dark:text-neutral-400 dark:hover:text-blue-400 transition-colors">
                      info@habiio.com
                    </a>
                  </div>
            </div>

            {/* Col 4: Social Brands */}
            <div className="flex flex-col items-center md:items-start gap-4">
               <h4 className="text-xs font-bold text-gray-400 dark:text-gray-500 uppercase tracking-widest">{t('footer.socials', 'Follow Us')}</h4>
               <div className="flex space-x-2">
                <a
                  className="size-8 inline-flex justify-center items-center gap-x-2 text-sm font-semibold rounded-full border border-transparent text-gray-500 hover:bg-gray-100 hover:text-blue-600 disabled:opacity-50 disabled:pointer-events-none dark:text-neutral-400 dark:hover:bg-neutral-800 dark:hover:text-blue-400 transition-all"
                  href="#"
                  aria-label="Facebook"
                >
                  <svg className="flex-shrink-0 size-4" xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="currentColor" viewBox="0 0 16 16">
                    <path d="M16 8.049c0-4.446-3.582-8.05-8-8.05C3.58 0-.002 3.603-.002 8.05c0 4.017 2.926 7.347 6.75 7.951v-5.625h-2.03V8.05H6.75V6.275c0-2.017 1.195-3.131 3.022-3.131.876 0 1.791.157 1.791.157v1.98h-1.009c-.993 0-1.303.621-1.303 1.258v1.51h2.218l-.354 2.326H9.25V16c3.824-.604 6.75-3.934 6.75-7.951z"/>
                  </svg>
                </a>
                <a
                  className="size-8 inline-flex justify-center items-center gap-x-2 text-sm font-semibold rounded-full border border-transparent text-gray-500 hover:bg-gray-100 hover:text-blue-600 disabled:opacity-50 disabled:pointer-events-none dark:text-neutral-400 dark:hover:bg-neutral-800 dark:hover:text-blue-400 transition-all"
                  href="#"
                  aria-label="Instagram"
                >
                  <svg className="flex-shrink-0 size-4 text-gray-500 dark:text-gray-400 group-hover:text-blue-600 dark:group-hover:text-blue-400" xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="currentColor" viewBox="0 0 16 16">
                    <path d="M8 0C5.829 0 5.556.01 4.703.048 3.85.088 3.269.222 2.76.42a3.917 3.917 0 0 0-1.417.923A3.927 3.927 0 0 0 .42 2.76C.222 3.268.087 3.85.048 4.7.01 5.555 0 5.827 0 8.001c0 2.172.01 2.444.048 3.297.04.852.174 1.433.372 1.942.205.526.478.972.923 1.417.444.445.89.719 1.416.923.51.198 1.09.333 1.942.372C5.555 15.99 5.827 16 8 16s2.444-.01 3.298-.048c.851-.04 1.434-.174 1.943-.372a3.916 3.916 0 0 0 1.416-.923c.445-.445.718-.891.923-1.417.197-.509.332-1.09.372-1.942C15.99 10.445 16 10.173 16 8s-.01-2.445-.048-3.299c-.04-.851-.175-1.433-.372-1.941a3.926 3.926 0 0 0-.923-1.417A3.911 3.911 0 0 0 13.24.42c-.51-.198-1.092-.333-1.943-.372C10.443.01 10.172 0 7.998 0h.003zm-.717 1.442h.718c2.136 0 2.389.007 3.232.046.78.035 1.204.166 1.486.275.373.145.64.319.92.599.28.28.453.546.598.92.11.281.24.705.275 1.485.039.843.047 1.096.047 3.231s-.008 2.389-.047 3.232c-.035.78-.166 1.203-.275 1.485a2.47 2.47 0 0 1-.599.919c-.28.28-.546.453-.92.598-.28.11-.704.24-1.485.276-.843.038-1.096.047-3.232.047s-2.39-.009-3.233-.047c-.78-.036-1.203-.166-1.485-.276a2.478 2.478 0 0 1-.92-.598 2.48 2.48 0 0 1-.6-.92c-.109-.281-.24-.705-.275-1.485-.038-.843-.046-1.096-.046-3.233 0-2.136.008-2.388.046-3.231.036-.78.166-1.204.276-1.486.145-.373.319-.64.599-.92.28-.28.546-.453.92-.598.282-.11.705-.24 1.485-.276.738-.034 1.024-.044 2.515-.045v.002zm4.988 1.328a.96.96 0 1 0 0 1.92.96.96 0 0 0 0-1.92zm-4.27 1.122a5.415 5.415 0 0 0-5.415 5.415 5.415 5.415 0 0 0 5.415 5.415 5.415 5.415 0 0 0 5.415-5.415 5.415 5.415 0 0 0-5.415-5.415zm0 9.168a3.753 3.753 0 1 1 0-7.506 3.753 3.753 0 0 1 0 7.506z"/>
                  </svg>
                </a>
                <a
                  className="size-8 inline-flex justify-center items-center gap-x-2 text-sm font-semibold rounded-full border border-transparent text-gray-500 hover:bg-gray-100 hover:text-blue-600 disabled:opacity-50 disabled:pointer-events-none dark:text-neutral-400 dark:hover:bg-neutral-800 dark:hover:text-blue-400 transition-all"
                  href="#"
                  aria-label="LinkedIn"
                >
                  <svg className="flex-shrink-0 size-4" xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="currentColor" viewBox="0 0 16 16">
                    <path d="M0 1.146C0 .513.526 0 1.175 0h13.65C15.474 0 16 .513 16 1.146v13.708c0 .633-.526 1.146-1.175 1.146H1.175C.526 16 0 15.487 0 14.854V1.146zm4.943 12.248V6.169H2.542v7.225h2.401zm-1.2-8.212c.837 0 1.358-.554 1.358-1.248-.015-.709-.52-1.248-1.342-1.248-.822 0-1.359.54-1.359 1.248 0 .694.521 1.248 1.327 1.248h.016zm4.908 8.212V9.359c0-.216.016-.432.08-.586.173-.431.568-.878 1.232-.878.869 0 1.216.662 1.216 1.634v3.865h2.401V9.25c0-2.22-1.184-3.252-2.764-3.252-1.274 0-1.845.7-2.165 1.193v.025h-.016a5.54 5.54 0 0 1 .016-.025V6.169h-2.4c.03.678 0 7.225 0 7.225h2.4z"/>
                  </svg>
                </a>
              </div>
            </div>
            {/* <!-- End Col --> */}

          </div>
          {/* <!-- End Grid --> */}

           {/* Copyright */}
           <div className="mt-8 pt-6 border-t border-gray-200 dark:border-neutral-700">
               <div className="text-center">
                   <p className="text-sm text-gray-500 dark:text-neutral-400">
                       © {new Date().getFullYear()} Habiio. All rights reserved.
                   </p>
               </div>
           </div>
        </div>
      </footer>
    </>
  );
}

export default Footer;
