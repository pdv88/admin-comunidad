import React from "react";
import { Link } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { useAuth } from "../../context/AuthContext";
import logo from "../../assets/logos/habiio_logo_header_nobg.webp";

function Header() {
  const { t, i18n } = useTranslation();
  const { user } = useAuth(); // Get user from AuthContext
  const [isMenuOpen, setIsMenuOpen] = React.useState(false);

  const changeLanguage = (lng) => {
    i18n.changeLanguage(lng);
  };

  const toggleMenu = () => {
    setIsMenuOpen(!isMenuOpen);
  };

  return (
    <header className="fixed top-4 inset-x-0 flex flex-wrap md:justify-start md:flex-nowrap z-50 w-full text-sm">
      <nav
        className={`relative w-[95%] lg:w-[80%] mx-auto px-4 md:flex md:items-center md:justify-between md:px-6 lg:px-8 bg-white/40 backdrop-blur-xl border border-white/20 shadow-lg shadow-gray-200/30 p-2 dark:bg-neutral-900/60 dark:border-neutral-700/50 dark:shadow-black/20 transition-all duration-300 ${isMenuOpen ? 'rounded-3xl' : 'rounded-full'}`}
        aria-label="Global"
      >
        <div className="flex items-center justify-between w-full md:w-auto">
          <Link
            className="flex items-center gap-2 text-xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-blue-600 to-violet-600 dark:from-blue-400 dark:to-violet-400 px-2"
            to="/"
            aria-label="Brand"
          >
            <img src={logo} alt="Logo" className="h-10 rounded-full" />
          </Link>
          <div className="md:hidden">
            <button
              type="button"
              className="hs-collapse-toggle size-9 flex justify-center items-center text-sm font-semibold rounded-full hover:bg-white/20 disabled:opacity-50 disabled:pointer-events-none text-gray-800 dark:text-white dark:hover:bg-neutral-800/50"
              onClick={toggleMenu}
              aria-label="Toggle navigation"
            >
              {isMenuOpen ? (
                <svg
                  className="flex-shrink-0 size-4"
                  xmlns="http://www.w3.org/2000/svg"
                  width="24"
                  height="24"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <path d="M18 6 6 18" />
                  <path d="m6 6 12 12" />
                </svg>
              ) : (
                <svg
                  className="flex-shrink-0 size-4"
                  xmlns="http://www.w3.org/2000/svg"
                  width="24"
                  height="24"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <line x1="3" x2="21" y1="6" y2="6" />
                  <line x1="3" x2="21" y1="12" y2="12" />
                  <line x1="3" x2="21" y1="18" y2="18" />
                </svg>
              )}
            </button>
          </div>
        </div>

        <div
          id="navbar-collapse-with-animation"
          className={`overflow-hidden transition-all duration-300 ease-out grid md:block ${isMenuOpen ? 'grid-rows-[1fr] opacity-100 mt-2' : 'grid-rows-[0fr] opacity-0 md:opacity-100 md:grid-rows-[1fr] mt-0'}`}
        >
          <div className="min-h-0">
            <div className="flex flex-col gap-y-4 gap-x-0 mt-2 md:flex-row md:items-center md:justify-end md:gap-y-0 md:gap-x-1 md:mt-0 md:ps-7">
              {user && (
                <Link
                  className="px-4 py-2 text-sm font-medium text-gray-600 hover:text-blue-600 rounded-full hover:bg-white/50 transition-colors dark:text-gray-300 dark:hover:text-blue-400 dark:hover:bg-neutral-800"
                  to="/dashboard"
                >
                  {t("header.dashboard")}
                </Link>
              )}

              <div className="flex items-center gap-x-2 md:ms-4">
                {/* Language Switcher */}
                <div className="flex bg-gray-100/50 hover:bg-gray-200/50 rounded-full transition p-1 dark:bg-neutral-700/50">
                  <button
                    onClick={() => changeLanguage('en')}
                    className={`px-2 py-1 rounded-full text-[10px] font-bold transition uppercase ${i18n.language === 'en' ? 'bg-white shadow-sm text-blue-600 dark:bg-neutral-800 dark:text-blue-400' : 'text-gray-500 hover:text-gray-700 dark:text-neutral-400'}`}
                  >
                    En
                  </button>
                  <button
                    onClick={() => changeLanguage('es')}
                    className={`px-2 py-1 rounded-full text-[10px] font-bold transition uppercase ${i18n.language === 'es' ? 'bg-white shadow-sm text-blue-600 dark:bg-neutral-800 dark:text-blue-400' : 'text-gray-500 hover:text-gray-700 dark:text-neutral-400'}`}
                  >
                    Es
                  </button>
                </div>

                <Link
                  to="/login"
                  className="px-4 py-2 text-sm font-medium text-gray-600 hover:text-blue-600 transition-colors dark:text-gray-300 dark:hover:text-blue-400"
                >
                  {t("header.login")}
                </Link>
                <Link
                  to="/register"
                  className="inline-flex justify-center items-center gap-x-2 text-sm font-semibold rounded-full border border-transparent bg-gradient-to-r from-blue-600 via-violet-600 to-blue-600 bg-[length:200%_auto] text-white hover:shadow-lg hover:bg-right active:scale-95 transition-all duration-500 py-2.5 px-6"
                >
                  {t("header.register")}
                </Link>
              </div>
            </div>
          </div>
        </div>
      </nav>
    </header>
  );
}

export default Header;
