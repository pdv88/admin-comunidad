import React from "react";
import UsersTable from "../assets/components/dashboard/UsersTable";
import Sidebar from "../assets/components/dashboard/Sidebar";
import DashboardHeader from "../assets/components/dashboard/DashboardHeader";

function Dashboard() {
  return (
    <>
      <DashboardHeader />

      {/* <!-- ========== MAIN CONTENT ========== --> */}
      {/* <!-- Breadcrumb --> */}
      <div className="sticky top-0 inset-x-0 z-20 bg-white border-y px-4 sm:px-6 md:px-8 lg:hidden dark:bg-neutral-800 dark:border-neutral-700">
        <div className="flex justify-between items-center py-2">
          {/* <!-- Breadcrumb --> */}
          <ol className="ms-3 flex items-center whitespace-nowrap">
            <li className="flex items-center text-sm text-gray-800 dark:text-neutral-400">
              Application Layout
              <svg
                className="flex-shrink-0 mx-3 overflow-visible size-2.5 text-gray-400 dark:text-neutral-500"
                width="16"
                height="16"
                viewBox="0 0 16 16"
                fill="none"
                xmlns="http://www.w3.org/2000/svg"
              >
                <path
                  d="M5 1L10.6869 7.16086C10.8637 7.35239 10.8637 7.64761 10.6869 7.83914L5 14"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                />
              </svg>
            </li>
            <li
              className="text-sm font-semibold text-gray-800 truncate dark:text-neutral-400"
              aria-current="page"
            >
              Dashboard
            </li>
          </ol>
          {/* <!-- End Breadcrumb --> */}

          {/* <!-- Sidebar --> */}
          <button
            type="button"
            className="py-2 px-3 flex justify-center items-center gap-x-1.5 text-xs rounded-lg border border-gray-200 text-gray-500 hover:text-gray-600 dark:border-neutral-700 dark:text-neutral-400 dark:hover:text-neutral-200"
            data-hs-overlay="#application-sidebar"
            aria-controls="application-sidebar"
            aria-label="Sidebar"
          >
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
              <path d="M17 8L21 12L17 16M3 12H13M3 6H13M3 18H13" />
            </svg>
            <span className="sr-only">Sidebar</span>
          </button>
          {/* <!-- End Sidebar --> */}
        </div>
      </div>
      {/* <!-- End Breadcrumb --> */}

      {/* Sidebar */}
      <Sidebar />

      {/* <!-- Content --> */}
      <div className="w-full lg:ps-64">
        <div className="p-4 sm:p-6 space-y-4 sm:space-y-6">
          {/* <!-- Grid --> */}
          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6">
            {/* <!-- Card --> */}
            <div className="flex flex-col bg-white border shadow-sm rounded-xl dark:bg-neutral-800 dark:border-neutral-700">
              <div className="p-4 md:p-5">
                <div className="flex items-center gap-x-2">
                  <p className="text-xs uppercase tracking-wide text-gray-500 dark:text-neutral-500">
                    Total users
                  </p>
                  <div className="hs-tooltip">
                    <div className="hs-tooltip-toggle">
                      <svg
                        className="flex-shrink-0 size-4 text-gray-500 dark:text-neutral-500"
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
                        <circle cx="12" cy="12" r="10" />
                        <path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3" />
                        <path d="M12 17h.01" />
                      </svg>
                      <span
                        className="hs-tooltip-content hs-tooltip-shown:opacity-100 hs-tooltip-shown:visible opacity-0 transition-opacity inline-block absolute invisible z-10 py-1 px-2 bg-gray-900 text-xs font-medium text-white rounded shadow-sm dark:bg-neutral-700"
                        role="tooltip"
                      >
                        The number of daily users
                      </span>
                    </div>
                  </div>
                </div>

                <div className="mt-1 flex items-center gap-x-2">
                  <h3 className="text-xl sm:text-2xl font-medium text-gray-800 dark:text-neutral-200">
                    72,540
                  </h3>
                  <span className="flex items-center gap-x-1 text-green-600">
                    <svg
                      className="inline-block size-4 self-center"
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
                      <polyline points="22 7 13.5 15.5 8.5 10.5 2 17" />
                      <polyline points="16 7 22 7 22 13" />
                    </svg>
                    <span className="inline-block text-sm">1.7%</span>
                  </span>
                </div>
              </div>
            </div>
            {/* <!-- End Card --> */}

            {/* <!-- Card --> */}
            <div className="flex flex-col bg-white border shadow-sm rounded-xl dark:bg-neutral-800 dark:border-neutral-700">
              <div className="p-4 md:p-5">
                <div className="flex items-center gap-x-2">
                  <p className="text-xs uppercase tracking-wide text-gray-500 dark:text-neutral-500">
                    Sessions
                  </p>
                </div>

                <div className="mt-1 flex items-center gap-x-2">
                  <h3 className="text-xl sm:text-2xl font-medium text-gray-800 dark:text-neutral-200">
                    29.4%
                  </h3>
                </div>
              </div>
            </div>
            {/* <!-- End Card --> */}

            {/* <!-- Card --> */}
            <div className="flex flex-col bg-white border shadow-sm rounded-xl dark:bg-neutral-800 dark:border-neutral-700">
              <div className="p-4 md:p-5">
                <div className="flex items-center gap-x-2">
                  <p className="text-xs uppercase tracking-wide text-gray-500 dark:text-neutral-500">
                    Avg. Click Rate
                  </p>
                </div>

                <div className="mt-1 flex items-center gap-x-2">
                  <h3 className="text-xl sm:text-2xl font-medium text-gray-800 dark:text-neutral-200">
                    56.8%
                  </h3>
                  <span className="flex items-center gap-x-1 text-red-600">
                    <svg
                      className="inline-block size-4 self-center"
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
                      <polyline points="22 17 13.5 8.5 8.5 13.5 2 7" />
                      <polyline points="16 17 22 17 22 11" />
                    </svg>
                    <span className="inline-block text-sm">1.7%</span>
                  </span>
                </div>
              </div>
            </div>
            {/* <!-- End Card --> */}

            {/* <!-- Card --> */}
            <div className="flex flex-col bg-white border shadow-sm rounded-xl dark:bg-neutral-800 dark:border-neutral-700">
              <div className="p-4 md:p-5">
                <div className="flex items-center gap-x-2">
                  <p className="text-xs uppercase tracking-wide text-gray-500 dark:text-neutral-500">
                    Pageviews
                  </p>
                </div>

                <div className="mt-1 flex items-center gap-x-2">
                  <h3 className="text-xl sm:text-2xl font-medium text-gray-800 dark:text-neutral-200">
                    92,913
                  </h3>
                </div>
              </div>
            </div>
            {/* <!-- End Card --> */}
          </div>
          {/* <!-- End Grid --> */}

          <div className="grid lg:grid-cols-2 gap-4 sm:gap-6">
            {/* <!-- Card --> */}
            <div className="p-4 md:p-5 min-h-[410px] flex flex-col bg-white border shadow-sm rounded-xl dark:bg-neutral-800 dark:border-neutral-700">
              {/* <!-- Header --> */}
              <div className="flex justify-between items-center">
                <div>
                  <h2 className="text-sm text-gray-500 dark:text-neutral-500">
                    Income
                  </h2>
                  <p className="text-xl sm:text-2xl font-medium text-gray-800 dark:text-neutral-200">
                    $126,238.49
                  </p>
                </div>

                <div>
                  <span className="py-[5px] px-1.5 inline-flex items-center gap-x-1 text-xs font-medium rounded-md bg-teal-100 text-teal-800 dark:bg-teal-500/10 dark:text-teal-500">
                    <svg
                      className="inline-block size-3.5"
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
                      <path d="M12 5v14" />
                      <path d="m19 12-7 7-7-7" />
                    </svg>
                    25%
                  </span>
                </div>
              </div>
              {/* <!-- End Header --> */}

              <div id="hs-multiple-bar-charts"></div>
            </div>
            {/* <!-- End Card --> */}

            {/* <!-- Card --> */}
            <div className="p-4 md:p-5 min-h-[410px] flex flex-col bg-white border shadow-sm rounded-xl dark:bg-neutral-800 dark:border-neutral-700">
              {/* <!-- Header --> */}
              <div className="flex justify-between items-center">
                <div>
                  <h2 className="text-sm text-gray-500 dark:text-neutral-500">
                    Visitors
                  </h2>
                  <p className="text-xl sm:text-2xl font-medium text-gray-800 dark:text-neutral-200">
                    80.3k
                  </p>
                </div>

                <div>
                  <span className="py-[5px] px-1.5 inline-flex items-center gap-x-1 text-xs font-medium rounded-md bg-red-100 text-red-800 dark:bg-red-500/10 dark:text-red-500">
                    <svg
                      className="inline-block size-3.5"
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
                      <path d="M12 5v14" />
                      <path d="m19 12-7 7-7-7" />
                    </svg>
                    2%
                  </span>
                </div>
              </div>
              {/* <!-- End Header --> */}

              <div id="hs-single-area-chart"></div>
            </div>
            {/* <!-- End Card --> */}
          </div>

          {/* <!-- Card --> */}
          <div className="flex flex-col">
            <div className="-m-1.5 overflow-x-auto">
              <div className="p-1.5 min-w-full inline-block align-middle">
                <div className="bg-white border border-gray-200 rounded-xl shadow-sm overflow-hidden dark:bg-neutral-800 dark:border-neutral-700">
                  {/* User Table */}
                  <UsersTable />
                </div>
              </div>
            </div>
          </div>
          {/* <!-- End Card --> */}
        </div>
      </div>
      {/* <!-- End Content --> */}
      {/* <!-- ========== END MAIN CONTENT ========== --> */}
    </>
  );
}

export default Dashboard;
