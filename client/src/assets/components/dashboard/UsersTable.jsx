import React from "react";

function UsersTable() {
  return (
    <>
      {/* <!-- Header --> */}
      <div className="px-6 py-4 grid gap-3 md:flex md:justify-between md:items-center border-b border-gray-200 dark:border-neutral-700">
        <div>
          <h2 className="text-xl font-semibold text-gray-800 dark:text-neutral-200">
            Users
          </h2>
          <p className="text-sm text-gray-600 dark:text-neutral-400">
            Add users, edit and more.
          </p>
        </div>

        <div>
          <div className="inline-flex gap-x-2">
            <a
              className="py-2 px-3 inline-flex items-center gap-x-2 text-sm font-medium rounded-lg border border-gray-200 bg-white text-gray-800 shadow-sm hover:bg-gray-50 disabled:opacity-50 disabled:pointer-events-none dark:bg-neutral-800 dark:border-neutral-700 dark:text-white dark:hover:bg-neutral-800"
              href="#"
            >
              View all
            </a>

            <a
              className="py-2 px-3 inline-flex items-center gap-x-2 text-sm font-semibold rounded-lg border border-transparent bg-blue-600 text-white hover:bg-blue-700 disabled:opacity-50 disabled:pointer-events-none"
              href="#"
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
                <path d="M5 12h14" />
                <path d="M12 5v14" />
              </svg>
              Add user
            </a>
          </div>
        </div>
      </div>
      {/* <!-- End Header --> */}

      {/* <!-- Table --> */}
      <table className="min-w-full divide-y divide-gray-200 dark:divide-neutral-700">
        <thead className="bg-gray-50 dark:bg-neutral-800">
          <tr>
            <th scope="col" className="ps-6 py-3 text-start">
              <label htmlFor="hs-at-with-checkboxes-main" className="flex">
                <input
                  type="checkbox"
                  className="shrink-0 border-gray-300 rounded text-blue-600 focus:ring-blue-500 disabled:opacity-50 disabled:pointer-events-none dark:bg-neutral-800 dark:border-neutral-600 dark:checked:bg-blue-500 dark:checked:border-blue-500 dark:focus:ring-offset-gray-800"
                  id="hs-at-with-checkboxes-main"
                />
                <span className="sr-only">Checkbox</span>
              </label>
            </th>

            <th
              scope="col"
              className="ps-6 lg:ps-3 xl:ps-0 pe-6 py-3 text-start"
            >
              <div className="flex items-center gap-x-2">
                <span className="text-xs font-semibold uppercase tracking-wide text-gray-800 dark:text-neutral-200">
                  Name
                </span>
              </div>
            </th>

            <th scope="col" className="px-6 py-3 text-start">
              <div className="flex items-center gap-x-2">
                <span className="text-xs font-semibold uppercase tracking-wide text-gray-800 dark:text-neutral-200">
                  Position
                </span>
              </div>
            </th>

            <th scope="col" className="px-6 py-3 text-start">
              <div className="flex items-center gap-x-2">
                <span className="text-xs font-semibold uppercase tracking-wide text-gray-800 dark:text-neutral-200">
                  Status
                </span>
              </div>
            </th>

            <th scope="col" className="px-6 py-3 text-start">
              <div className="flex items-center gap-x-2">
                <span className="text-xs font-semibold uppercase tracking-wide text-gray-800 dark:text-neutral-200">
                  Portfolio
                </span>
              </div>
            </th>

            <th scope="col" className="px-6 py-3 text-start">
              <div className="flex items-center gap-x-2">
                <span className="text-xs font-semibold uppercase tracking-wide text-gray-800 dark:text-neutral-200">
                  Created
                </span>
              </div>
            </th>

            <th scope="col" className="px-6 py-3 text-end"></th>
          </tr>
        </thead>

        <tbody className="divide-y divide-gray-200 dark:divide-neutral-700">
          <tr>
            <td className="size-px whitespace-nowrap">
              <div className="ps-6 py-3">
                <label htmlFor="hs-at-with-checkboxes-1" className="flex">
                  <input
                    type="checkbox"
                    className="shrink-0 border-gray-300 rounded text-blue-600 focus:ring-blue-500 disabled:opacity-50 disabled:pointer-events-none dark:bg-neutral-800 dark:border-neutral-600 dark:checked:bg-blue-500 dark:checked:border-blue-500 dark:focus:ring-offset-gray-800"
                    id="hs-at-with-checkboxes-1"
                  />
                  <span className="sr-only">Checkbox</span>
                </label>
              </div>
            </td>
            <td className="size-px whitespace-nowrap">
              <div className="ps-6 lg:ps-3 xl:ps-0 pe-6 py-3">
                <div className="flex items-center gap-x-3">
                  <img
                    className="inline-block size-[38px] rounded-full"
                    src="https://images.unsplash.com/photo-1531927557220-a9e23c1e4794?ixlib=rb-4.0.3&ixid=MnwxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8&auto=format&fit=facearea&facepad=2&w=300&h=300&q=80"
                    alt="Image Description"
                  />
                  <div className="grow">
                    <span className="block text-sm font-semibold text-gray-800 dark:text-neutral-200">
                      Christina Bersh
                    </span>
                    <span className="block text-sm text-gray-500 dark:text-neutral-500">
                      christina@site.com
                    </span>
                  </div>
                </div>
              </div>
            </td>
            <td className="h-px w-72 whitespace-nowrap">
              <div className="px-6 py-3">
                <span className="block text-sm font-semibold text-gray-800 dark:text-neutral-200">
                  Director
                </span>
                <span className="block text-sm text-gray-500 dark:text-neutral-500">
                  Human resources
                </span>
              </div>
            </td>
            <td className="size-px whitespace-nowrap">
              <div className="px-6 py-3">
                <span className="py-1 px-1.5 inline-flex items-center gap-x-1 text-xs font-medium bg-teal-100 text-teal-800 rounded-full dark:bg-teal-500/10 dark:text-teal-500">
                  <svg
                    className="size-2.5"
                    xmlns="http://www.w3.org/2000/svg"
                    width="16"
                    height="16"
                    fill="currentColor"
                    viewBox="0 0 16 16"
                  >
                    <path d="M16 8A8 8 0 1 1 0 8a8 8 0 0 1 16 0zm-3.97-3.03a.75.75 0 0 0-1.08.022L7.477 9.417 5.384 7.323a.75.75 0 0 0-1.06 1.06L6.97 11.03a.75.75 0 0 0 1.079-.02l3.992-4.99a.75.75 0 0 0-.01-1.05z" />
                  </svg>
                  Active
                </span>
              </div>
            </td>
            <td className="size-px whitespace-nowrap">
              <div className="px-6 py-3">
                <div className="flex items-center gap-x-3">
                  <span className="text-xs text-gray-500 dark:text-neutral-500">
                    1/5
                  </span>
                  <div className="flex w-full h-1.5 bg-gray-200 rounded-full overflow-hidden dark:bg-neutral-700">
                    <div
                      className="flex flex-col justify-center overflow-hidden bg-gray-800 dark:bg-neutral-200"
                      role="progressbar"
                      style={{ width: "25%" }}
                      aria-valuenow="25"
                      aria-valuemin="0"
                      aria-valuemax="100"
                    ></div>
                  </div>
                </div>
              </div>
            </td>
            <td className="size-px whitespace-nowrap">
              <div className="px-6 py-3">
                <span className="text-sm text-gray-500 dark:text-neutral-500">
                  28 Dec, 12:12
                </span>
              </div>
            </td>
            <td className="size-px whitespace-nowrap">
              <div className="px-6 py-1.5">
                <a
                  className="inline-flex items-center gap-x-1 text-sm text-blue-600 decoration-2 hover:underline font-medium dark:text-blue-500"
                  href="#"
                >
                  Edit
                </a>
              </div>
            </td>
          </tr>

          <tr>
            <td className="size-px whitespace-nowrap">
              <div className="ps-6 py-3">
                <label htmlFor="hs-at-with-checkboxes-2" className="flex">
                  <input
                    type="checkbox"
                    className="shrink-0 border-gray-300 rounded text-blue-600 focus:ring-blue-500 disabled:opacity-50 disabled:pointer-events-none dark:bg-neutral-800 dark:border-neutral-600 dark:checked:bg-blue-500 dark:checked:border-blue-500 dark:focus:ring-offset-gray-800"
                    id="hs-at-with-checkboxes-2"
                  />
                  <span className="sr-only">Checkbox</span>
                </label>
              </div>
            </td>
            <td className="size-px whitespace-nowrap">
              <div className="ps-6 lg:ps-3 xl:ps-0 pe-6 py-3">
                <div className="flex items-center gap-x-3">
                  <img
                    className="inline-block size-[38px] rounded-full"
                    src="https://images.unsplash.com/photo-1568602471122-7832951cc4c5?ixlib=rb-4.0.3&ixid=MnwxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8&auto=format&fit=facearea&facepad=2&w=300&h=300&q=80"
                    alt="Image Description"
                  />
                  <div className="grow">
                    <span className="block text-sm font-semibold text-gray-800 dark:text-neutral-200">
                      David Harrison
                    </span>
                    <span className="block text-sm text-gray-500 dark:text-neutral-500">
                      david@site.com
                    </span>
                  </div>
                </div>
              </div>
            </td>
            <td className="h-px w-72 whitespace-nowrap">
              <div className="px-6 py-3">
                <span className="block text-sm font-semibold text-gray-800 dark:text-neutral-200">
                  Seller
                </span>
                <span className="block text-sm text-gray-500 dark:text-neutral-500">
                  Branding products
                </span>
              </div>
            </td>
            <td className="size-px whitespace-nowrap">
              <div className="px-6 py-3">
                <span className="py-1 px-1.5 inline-flex items-center gap-x-1 text-xs font-medium bg-yellow-100 text-yellow-800 rounded-full dark:bg-yellow-500/10 dark:text-yellow-500">
                  <svg
                    className="size-2.5"
                    xmlns="http://www.w3.org/2000/svg"
                    width="16"
                    height="16"
                    fill="currentColor"
                    viewBox="0 0 16 16"
                  >
                    <path d="M8.982 1.566a1.13 1.13 0 0 0-1.96 0L.165 13.233c-.457.778.091 1.767.98 1.767h13.713c.889 0 1.438-.99.98-1.767L8.982 1.566zM8 5c.535 0 .954.462.9.995l-.35 3.507a.552.552 0 0 1-1.1 0L7.1 5.995A.905.905 0 0 1 8 5zm.002 6a1 1 0 1 1 0 2 1 1 0 0 1 0-2z" />
                  </svg>
                  Warning
                </span>
              </div>
            </td>
            <td className="size-px whitespace-nowrap">
              <div className="px-6 py-3">
                <div className="flex items-center gap-x-3">
                  <span className="text-xs text-gray-500 dark:text-neutral-500">
                    3/5
                  </span>
                  <div className="flex w-full h-1.5 bg-gray-200 rounded-full overflow-hidden dark:bg-neutral-700">
                    <div
                      className="flex flex-col justify-center overflow-hidden bg-gray-800 dark:bg-neutral-200"
                      role="progressbar"
                      style={{ width: "78%" }}
                      aria-valuenow="78"
                      aria-valuemin="0"
                      aria-valuemax="100"
                    ></div>
                  </div>
                </div>
              </div>
            </td>
            <td className="size-px whitespace-nowrap">
              <div className="px-6 py-3">
                <span className="text-sm text-gray-500 dark:text-neutral-500">
                  20 Dec, 09:27
                </span>
              </div>
            </td>
            <td className="size-px whitespace-nowrap">
              <div className="px-6 py-1.5">
                <a
                  className="inline-flex items-center gap-x-1 text-sm text-blue-600 decoration-2 hover:underline font-medium dark:text-blue-500"
                  href="#"
                >
                  Edit
                </a>
              </div>
            </td>
          </tr>

          <tr>
            <td className="size-px whitespace-nowrap">
              <div className="ps-6 py-3">
                <label htmlFor="hs-at-with-checkboxes-3" className="flex">
                  <input
                    type="checkbox"
                    className="shrink-0 border-gray-300 rounded text-blue-600 focus:ring-blue-500 disabled:opacity-50 disabled:pointer-events-none dark:bg-neutral-800 dark:border-neutral-600 dark:checked:bg-blue-500 dark:checked:border-blue-500 dark:focus:ring-offset-gray-800"
                    id="hs-at-with-checkboxes-3"
                  />
                  <span className="sr-only">Checkbox</span>
                </label>
              </div>
            </td>
            <td className="size-px whitespace-nowrap">
              <div className="ps-6 lg:ps-3 xl:ps-0 pe-6 py-3">
                <div className="flex items-center gap-x-3">
                  <span className="inline-flex items-center justify-center size-[38px] rounded-full bg-white border border-gray-300 dark:bg-neutral-800 dark:border-neutral-700">
                    <span className="font-medium text-sm text-gray-800 leading-none dark:text-neutral-200">
                      A
                    </span>
                  </span>
                  <div className="grow">
                    <span className="block text-sm font-semibold text-gray-800 dark:text-neutral-200">
                      Anne Richard
                    </span>
                    <span className="block text-sm text-gray-500 dark:text-neutral-500">
                      anne@site.com
                    </span>
                  </div>
                </div>
              </div>
            </td>
            <td className="h-px w-72 whitespace-nowrap">
              <div className="px-6 py-3">
                <span className="block text-sm font-semibold text-gray-800 dark:text-neutral-200">
                  Designer
                </span>
                <span className="block text-sm text-gray-500 dark:text-neutral-500">
                  IT department
                </span>
              </div>
            </td>
            <td className="size-px whitespace-nowrap">
              <div className="px-6 py-3">
                <span className="py-1 px-1.5 inline-flex items-center gap-x-1 text-xs font-medium bg-teal-100 text-teal-800 rounded-full dark:bg-teal-500/10 dark:text-teal-500">
                  <svg
                    className="size-2.5"
                    xmlns="http://www.w3.org/2000/svg"
                    width="16"
                    height="16"
                    fill="currentColor"
                    viewBox="0 0 16 16"
                  >
                    <path d="M16 8A8 8 0 1 1 0 8a8 8 0 0 1 16 0zm-3.97-3.03a.75.75 0 0 0-1.08.022L7.477 9.417 5.384 7.323a.75.75 0 0 0-1.06 1.06L6.97 11.03a.75.75 0 0 0 1.079-.02l3.992-4.99a.75.75 0 0 0-.01-1.05z" />
                  </svg>
                  Active
                </span>
              </div>
            </td>
            <td className="size-px whitespace-nowrap">
              <div className="px-6 py-3">
                <div className="flex items-center gap-x-3">
                  <span className="text-xs text-gray-500 dark:text-neutral-500">
                    5/5
                  </span>
                  <div className="flex w-full h-1.5 bg-gray-200 rounded-full overflow-hidden dark:bg-neutral-700">
                    <div
                      className="flex flex-col justify-center overflow-hidden bg-gray-800 dark:bg-neutral-200"
                      role="progressbar"
                      style={{ width: "100%" }}
                      aria-valuenow="100"
                      aria-valuemin="0"
                      aria-valuemax="100"
                    ></div>
                  </div>
                </div>
              </div>
            </td>
            <td className="size-px whitespace-nowrap">
              <div className="px-6 py-3">
                <span className="text-sm text-gray-500 dark:text-neutral-500">
                  18 Dec, 15:20
                </span>
              </div>
            </td>
            <td className="size-px whitespace-nowrap">
              <div className="px-6 py-1.5">
                <a
                  className="inline-flex items-center gap-x-1 text-sm text-blue-600 decoration-2 hover:underline font-medium dark:text-blue-500"
                  href="#"
                >
                  Edit
                </a>
              </div>
            </td>
          </tr>

          <tr>
            <td className="size-px whitespace-nowrap">
              <div className="ps-6 py-3">
                <label htmlFor="hs-at-with-checkboxes-4" className="flex">
                  <input
                    type="checkbox"
                    className="shrink-0 border-gray-300 rounded text-blue-600 focus:ring-blue-500 disabled:opacity-50 disabled:pointer-events-none dark:bg-neutral-800 dark:border-neutral-600 dark:checked:bg-blue-500 dark:checked:border-blue-500 dark:focus:ring-offset-gray-800"
                    id="hs-at-with-checkboxes-4"
                  />
                  <span className="sr-only">Checkbox</span>
                </label>
              </div>
            </td>
            <td className="size-px whitespace-nowrap">
              <div className="ps-6 lg:ps-3 xl:ps-0 pe-6 py-3">
                <div className="flex items-center gap-x-3">
                  <img
                    className="inline-block size-[38px] rounded-full"
                    src="https://images.unsplash.com/photo-1541101767792-f9b2b1c4f127?ixlib=rb-4.0.3&ixid=MnwxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8&&auto=format&fit=facearea&facepad=3&w=300&h=300&q=80"
                    alt="Image Description"
                  />
                  <div className="grow">
                    <span className="block text-sm font-semibold text-gray-800 dark:text-neutral-200">
                      Samia Kartoon
                    </span>
                    <span className="block text-sm text-gray-500 dark:text-neutral-500">
                      samia@site.com
                    </span>
                  </div>
                </div>
              </div>
            </td>
            <td className="h-px w-72 whitespace-nowrap">
              <div className="px-6 py-3">
                <span className="block text-sm font-semibold text-gray-800 dark:text-neutral-200">
                  Executive director
                </span>
                <span className="block text-sm text-gray-500 dark:text-neutral-500">
                  Marketing
                </span>
              </div>
            </td>
            <td className="size-px whitespace-nowrap">
              <div className="px-6 py-3">
                <span className="py-1 px-1.5 inline-flex items-center gap-x-1 text-xs font-medium bg-teal-100 text-teal-800 rounded-full dark:bg-teal-500/10 dark:text-teal-500">
                  <svg
                    className="size-2.5"
                    xmlns="http://www.w3.org/2000/svg"
                    width="16"
                    height="16"
                    fill="currentColor"
                    viewBox="0 0 16 16"
                  >
                    <path d="M16 8A8 8 0 1 1 0 8a8 8 0 0 1 16 0zm-3.97-3.03a.75.75 0 0 0-1.08.022L7.477 9.417 5.384 7.323a.75.75 0 0 0-1.06 1.06L6.97 11.03a.75.75 0 0 0 1.079-.02l3.992-4.99a.75.75 0 0 0-.01-1.05z" />
                  </svg>
                  Active
                </span>
              </div>
            </td>
            <td className="size-px whitespace-nowrap">
              <div className="px-6 py-3">
                <div className="flex items-center gap-x-3">
                  <span className="text-xs text-gray-500 dark:text-neutral-500">
                    0/5
                  </span>
                  <div className="flex w-full h-1.5 bg-gray-200 rounded-full overflow-hidden dark:bg-neutral-700">
                    <div
                      className="flex flex-col justify-center overflow-hidden bg-gray-800 dark:bg-neutral-200"
                      role="progressbar"
                      style={{ width: "1%" }}
                      aria-valuenow="1"
                      aria-valuemin="0"
                      aria-valuemax="100"
                    ></div>
                  </div>
                </div>
              </div>
            </td>
            <td className="size-px whitespace-nowrap">
              <div className="px-6 py-3">
                <span className="text-sm text-gray-500 dark:text-neutral-500">
                  18 Dec, 15:20
                </span>
              </div>
            </td>
            <td className="size-px whitespace-nowrap">
              <div className="px-6 py-1.5">
                <a
                  className="inline-flex items-center gap-x-1 text-sm text-blue-600 decoration-2 hover:underline font-medium dark:text-blue-500"
                  href="#"
                >
                  Edit
                </a>
              </div>
            </td>
          </tr>

          <tr>
            <td className="size-px whitespace-nowrap">
              <div className="ps-6 py-3">
                <label htmlFor="hs-at-with-checkboxes-5" className="flex">
                  <input
                    type="checkbox"
                    className="shrink-0 border-gray-300 rounded text-blue-600 focus:ring-blue-500 disabled:opacity-50 disabled:pointer-events-none dark:bg-neutral-800 dark:border-neutral-600 dark:checked:bg-blue-500 dark:checked:border-blue-500 dark:focus:ring-offset-gray-800"
                    id="hs-at-with-checkboxes-5"
                  />
                  <span className="sr-only">Checkbox</span>
                </label>
              </div>
            </td>
            <td className="size-px whitespace-nowrap">
              <div className="ps-6 lg:ps-3 xl:ps-0 pe-6 py-3">
                <div className="flex items-center gap-x-3">
                  <span className="inline-flex items-center justify-center size-[38px] rounded-full bg-white border border-gray-300 dark:bg-neutral-800 dark:border-neutral-700">
                    <span className="font-medium text-sm text-gray-800 leading-none dark:text-neutral-200">
                      D
                    </span>
                  </span>
                  <div className="grow">
                    <span className="block text-sm font-semibold text-gray-800 dark:text-neutral-200">
                      David Harrison
                    </span>
                    <span className="block text-sm text-gray-500 dark:text-neutral-500">
                      david@site.com
                    </span>
                  </div>
                </div>
              </div>
            </td>
            <td className="h-px w-72 whitespace-nowrap">
              <div className="px-6 py-3">
                <span className="block text-sm font-semibold text-gray-800 dark:text-neutral-200">
                  Developer
                </span>
                <span className="block text-sm text-gray-500 dark:text-neutral-500">
                  Mobile app
                </span>
              </div>
            </td>
            <td className="size-px whitespace-nowrap">
              <div className="px-6 py-3">
                <span className="py-1 px-1.5 inline-flex items-center gap-x-1 text-xs font-medium bg-red-100 text-red-800 rounded-full dark:bg-red-500/10 dark:text-red-500">
                  <svg
                    className="size-2.5"
                    xmlns="http://www.w3.org/2000/svg"
                    width="16"
                    height="16"
                    fill="currentColor"
                    viewBox="0 0 16 16"
                  >
                    <path d="M8.982 1.566a1.13 1.13 0 0 0-1.96 0L.165 13.233c-.457.778.091 1.767.98 1.767h13.713c.889 0 1.438-.99.98-1.767L8.982 1.566zM8 5c.535 0 .954.462.9.995l-.35 3.507a.552.552 0 0 1-1.1 0L7.1 5.995A.905.905 0 0 1 8 5zm.002 6a1 1 0 1 1 0 2 1 1 0 0 1 0-2z" />
                  </svg>
                  Danger
                </span>
              </div>
            </td>
            <td className="size-px whitespace-nowrap">
              <div className="px-6 py-3">
                <div className="flex items-center gap-x-3">
                  <span className="text-xs text-gray-500 dark:text-neutral-500">
                    3/5
                  </span>
                  <div className="flex w-full h-1.5 bg-gray-200 rounded-full overflow-hidden dark:bg-neutral-700">
                    <div
                      className="flex flex-col justify-center overflow-hidden bg-gray-800 dark:bg-neutral-200"
                      role="progressbar"
                      style={{ width: "78%" }}
                      aria-valuenow="78"
                      aria-valuemin="0"
                      aria-valuemax="100"
                    ></div>
                  </div>
                </div>
              </div>
            </td>
            <td className="size-px whitespace-nowrap">
              <div className="px-6 py-3">
                <span className="text-sm text-gray-500 dark:text-neutral-500">
                  15 Dec, 14:41
                </span>
              </div>
            </td>
            <td className="size-px whitespace-nowrap">
              <div className="px-6 py-1.5">
                <a
                  className="inline-flex items-center gap-x-1 text-sm text-blue-600 decoration-2 hover:underline font-medium dark:text-blue-500"
                  href="#"
                >
                  Edit
                </a>
              </div>
            </td>
          </tr>

          <tr>
            <td className="size-px whitespace-nowrap">
              <div className="ps-6 py-3">
                <label htmlFor="hs-at-with-checkboxes-6" className="flex">
                  <input
                    type="checkbox"
                    className="shrink-0 border-gray-300 rounded text-blue-600 focus:ring-blue-500 disabled:opacity-50 disabled:pointer-events-none dark:bg-neutral-800 dark:border-neutral-600 dark:checked:bg-blue-500 dark:checked:border-blue-500 dark:focus:ring-offset-gray-800"
                    id="hs-at-with-checkboxes-6"
                  />
                  <span className="sr-only">Checkbox</span>
                </label>
              </div>
            </td>
            <td className="size-px whitespace-nowrap">
              <div className="ps-6 lg:ps-3 xl:ps-0 pe-6 py-3">
                <div className="flex items-center gap-x-3">
                  <img
                    className="inline-block size-[38px] rounded-full"
                    src="https://images.unsplash.com/photo-1492562080023-ab3db95bfbce?ixlib=rb-4.0.3&ixid=MnwxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8&auto=format&fit=facearea&facepad=2&w=300&h=300&q=80"
                    alt="Image Description"
                  />
                  <div className="grow">
                    <span className="block text-sm font-semibold text-gray-800 dark:text-neutral-200">
                      Brian Halligan
                    </span>
                    <span className="block text-sm text-gray-500 dark:text-neutral-500">
                      brian@site.com
                    </span>
                  </div>
                </div>
              </div>
            </td>
            <td className="h-px w-72 whitespace-nowrap">
              <div className="px-6 py-3">
                <span className="block text-sm font-semibold text-gray-800 dark:text-neutral-200">
                  Accountant
                </span>
                <span className="block text-sm text-gray-500 dark:text-neutral-500">
                  Finance
                </span>
              </div>
            </td>
            <td className="size-px whitespace-nowrap">
              <div className="px-6 py-3">
                <span className="py-1 px-1.5 inline-flex items-center gap-x-1 text-xs font-medium bg-teal-100 text-teal-800 rounded-full dark:bg-teal-500/10 dark:text-teal-500">
                  <svg
                    className="size-2.5"
                    xmlns="http://www.w3.org/2000/svg"
                    width="16"
                    height="16"
                    fill="currentColor"
                    viewBox="0 0 16 16"
                  >
                    <path d="M16 8A8 8 0 1 1 0 8a8 8 0 0 1 16 0zm-3.97-3.03a.75.75 0 0 0-1.08.022L7.477 9.417 5.384 7.323a.75.75 0 0 0-1.06 1.06L6.97 11.03a.75.75 0 0 0 1.079-.02l3.992-4.99a.75.75 0 0 0-.01-1.05z" />
                  </svg>
                  Active
                </span>
              </div>
            </td>
            <td className="size-px whitespace-nowrap">
              <div className="px-6 py-3">
                <div className="flex items-center gap-x-3">
                  <span className="text-xs text-gray-500 dark:text-neutral-500">
                    2/5
                  </span>
                  <div className="flex w-full h-1.5 bg-gray-200 rounded-full overflow-hidden dark:bg-neutral-700">
                    <div
                      className="flex flex-col justify-center overflow-hidden bg-gray-800 dark:bg-neutral-200"
                      role="progressbar"
                      style={{ width: "40%" }}
                      aria-valuenow="40"
                      aria-valuemin="0"
                      aria-valuemax="100"
                    ></div>
                  </div>
                </div>
              </div>
            </td>
            <td className="size-px whitespace-nowrap">
              <div className="px-6 py-3">
                <span className="text-sm text-gray-500 dark:text-neutral-500">
                  11 Dec, 18:51
                </span>
              </div>
            </td>
            <td className="size-px whitespace-nowrap">
              <div className="px-6 py-1.5">
                <a
                  className="inline-flex items-center gap-x-1 text-sm text-blue-600 decoration-2 hover:underline font-medium dark:text-blue-500"
                  href="#"
                >
                  Edit
                </a>
              </div>
            </td>
          </tr>

          <tr>
            <td className="size-px whitespace-nowrap">
              <div className="ps-6 py-3">
                <label htmlFor="hs-at-with-checkboxes-7" className="flex">
                  <input
                    type="checkbox"
                    className="shrink-0 border-gray-300 rounded text-blue-600 focus:ring-blue-500 disabled:opacity-50 disabled:pointer-events-none dark:bg-neutral-800 dark:border-neutral-600 dark:checked:bg-blue-500 dark:checked:border-blue-500 dark:focus:ring-offset-gray-800"
                    id="hs-at-with-checkboxes-7"
                  />
                  <span className="sr-only">Checkbox</span>
                </label>
              </div>
            </td>
            <td className="size-px whitespace-nowrap">
              <div className="ps-6 lg:ps-3 xl:ps-0 pe-6 py-3">
                <div className="flex items-center gap-x-3">
                  <img
                    className="inline-block size-[38px] rounded-full"
                    src="https://images.unsplash.com/photo-1659482634023-2c4fda99ac0c?ixlib=rb-4.0.3&ixid=MnwxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8&auto=format&fit=facearea&facepad=2.5&w=320&h=320&q=80"
                    alt="Image Description"
                  />
                  <div className="grow">
                    <span className="block text-sm font-semibold text-gray-800 dark:text-neutral-200">
                      Andy Clerk
                    </span>
                    <span className="block text-sm text-gray-500 dark:text-neutral-500">
                      andy@site.com
                    </span>
                  </div>
                </div>
              </div>
            </td>
            <td className="h-px w-72 whitespace-nowrap">
              <div className="px-6 py-3">
                <span className="block text-sm font-semibold text-gray-800 dark:text-neutral-200">
                  Director
                </span>
                <span className="block text-sm text-gray-500 dark:text-neutral-500">
                  Human resources
                </span>
              </div>
            </td>
            <td className="size-px whitespace-nowrap">
              <div className="px-6 py-3">
                <span className="py-1 px-1.5 inline-flex items-center gap-x-1 text-xs font-medium bg-teal-100 text-teal-800 rounded-full dark:bg-teal-500/10 dark:text-teal-500">
                  <svg
                    className="size-2.5"
                    xmlns="http://www.w3.org/2000/svg"
                    width="16"
                    height="16"
                    fill="currentColor"
                    viewBox="0 0 16 16"
                  >
                    <path d="M16 8A8 8 0 1 1 0 8a8 8 0 0 1 16 0zm-3.97-3.03a.75.75 0 0 0-1.08.022L7.477 9.417 5.384 7.323a.75.75 0 0 0-1.06 1.06L6.97 11.03a.75.75 0 0 0 1.079-.02l3.992-4.99a.75.75 0 0 0-.01-1.05z" />
                  </svg>
                  Active
                </span>
              </div>
            </td>
            <td className="size-px whitespace-nowrap">
              <div className="px-6 py-3">
                <div className="flex items-center gap-x-3">
                  <span className="text-xs text-gray-500 dark:text-neutral-500">
                    1/5
                  </span>
                  <div className="flex w-full h-1.5 bg-gray-200 rounded-full overflow-hidden dark:bg-neutral-700">
                    <div
                      className="flex flex-col justify-center overflow-hidden bg-gray-800 dark:bg-neutral-200"
                      role="progressbar"
                      style={{ width: "25%" }}
                      aria-valuenow="25"
                      aria-valuemin="0"
                      aria-valuemax="100"
                    ></div>
                  </div>
                </div>
              </div>
            </td>
            <td className="size-px whitespace-nowrap">
              <div className="px-6 py-3">
                <span className="text-sm text-gray-500 dark:text-neutral-500">
                  28 Dec, 12:12
                </span>
              </div>
            </td>
            <td className="size-px whitespace-nowrap">
              <div className="px-6 py-1.5">
                <a
                  className="inline-flex items-center gap-x-1 text-sm text-blue-600 decoration-2 hover:underline font-medium dark:text-blue-500"
                  href="#"
                >
                  Edit
                </a>
              </div>
            </td>
          </tr>

          <tr>
            <td className="size-px whitespace-nowrap">
              <div className="ps-6 py-3">
                <label htmlFor="hs-at-with-checkboxes-8" className="flex">
                  <input
                    type="checkbox"
                    className="shrink-0 border-gray-300 rounded text-blue-600 focus:ring-blue-500 disabled:opacity-50 disabled:pointer-events-none dark:bg-neutral-800 dark:border-neutral-600 dark:checked:bg-blue-500 dark:checked:border-blue-500 dark:focus:ring-offset-gray-800"
                    id="hs-at-with-checkboxes-8"
                  />
                  <span className="sr-only">Checkbox</span>
                </label>
              </div>
            </td>
            <td className="size-px whitespace-nowrap">
              <div className="ps-6 lg:ps-3 xl:ps-0 pe-6 py-3">
                <div className="flex items-center gap-x-3">
                  <img
                    className="inline-block size-[38px] rounded-full"
                    src="https://images.unsplash.com/photo-1601935111741-ae98b2b230b0?ixlib=rb-4.0.3&ixid=MnwxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8&auto=format&fit=facearea&facepad=2&w=320&h=320&q=80"
                    alt="Image Description"
                  />
                  <div className="grow">
                    <span className="block text-sm font-semibold text-gray-800 dark:text-neutral-200">
                      Bart Simpson
                    </span>
                    <span className="block text-sm text-gray-500 dark:text-neutral-500">
                      Bart@site.com
                    </span>
                  </div>
                </div>
              </div>
            </td>
            <td className="h-px w-72 whitespace-nowrap">
              <div className="px-6 py-3">
                <span className="block text-sm font-semibold text-gray-800 dark:text-neutral-200">
                  Seller
                </span>
                <span className="block text-sm text-gray-500 dark:text-neutral-500">
                  Branding products
                </span>
              </div>
            </td>
            <td className="size-px whitespace-nowrap">
              <div className="px-6 py-3">
                <span className="py-1 px-1.5 inline-flex items-center gap-x-1 text-xs font-medium bg-yellow-100 text-yellow-800 rounded-full dark:bg-yellow-500/10 dark:text-yellow-500">
                  <svg
                    className="size-2.5"
                    xmlns="http://www.w3.org/2000/svg"
                    width="16"
                    height="16"
                    fill="currentColor"
                    viewBox="0 0 16 16"
                  >
                    <path d="M8.982 1.566a1.13 1.13 0 0 0-1.96 0L.165 13.233c-.457.778.091 1.767.98 1.767h13.713c.889 0 1.438-.99.98-1.767L8.982 1.566zM8 5c.535 0 .954.462.9.995l-.35 3.507a.552.552 0 0 1-1.1 0L7.1 5.995A.905.905 0 0 1 8 5zm.002 6a1 1 0 1 1 0 2 1 1 0 0 1 0-2z" />
                  </svg>
                  Warning
                </span>
              </div>
            </td>
            <td className="size-px whitespace-nowrap">
              <div className="px-6 py-3">
                <div className="flex items-center gap-x-3">
                  <span className="text-xs text-gray-500 dark:text-neutral-500">
                    3/5
                  </span>
                  <div className="flex w-full h-1.5 bg-gray-200 rounded-full overflow-hidden dark:bg-neutral-700">
                    <div
                      className="flex flex-col justify-center overflow-hidden bg-gray-800 dark:bg-neutral-200"
                      role="progressbar"
                      style={{ width: "78%" }}
                      aria-valuenow="78"
                      aria-valuemin="0"
                      aria-valuemax="100"
                    ></div>
                  </div>
                </div>
              </div>
            </td>
            <td className="size-px whitespace-nowrap">
              <div className="px-6 py-3">
                <span className="text-sm text-gray-500 dark:text-neutral-500">
                  20 Dec, 09:27
                </span>
              </div>
            </td>
            <td className="size-px whitespace-nowrap">
              <div className="px-6 py-1.5">
                <a
                  className="inline-flex items-center gap-x-1 text-sm text-blue-600 decoration-2 hover:underline font-medium dark:text-blue-500"
                  href="#"
                >
                  Edit
                </a>
              </div>
            </td>
          </tr>

          <tr>
            <td className="size-px whitespace-nowrap">
              <div className="ps-6 py-3">
                <label htmlFor="hs-at-with-checkboxes-9" className="flex">
                  <input
                    type="checkbox"
                    className="shrink-0 border-gray-300 rounded text-blue-600 focus:ring-blue-500 disabled:opacity-50 disabled:pointer-events-none dark:bg-neutral-800 dark:border-neutral-600 dark:checked:bg-blue-500 dark:checked:border-blue-500 dark:focus:ring-offset-gray-800"
                    id="hs-at-with-checkboxes-9"
                  />
                  <span className="sr-only">Checkbox</span>
                </label>
              </div>
            </td>
            <td className="size-px whitespace-nowrap">
              <div className="ps-6 lg:ps-3 xl:ps-0 pe-6 py-3">
                <div className="flex items-center gap-x-3">
                  <span className="inline-flex items-center justify-center size-[38px] rounded-full bg-white border border-gray-300 dark:bg-neutral-800 dark:border-neutral-700">
                    <span className="font-medium text-sm text-gray-800 leading-none dark:text-neutral-200">
                      C
                    </span>
                  </span>
                  <div className="grow">
                    <span className="block text-sm font-semibold text-gray-800 dark:text-neutral-200">
                      Camila Welters
                    </span>
                    <span className="block text-sm text-gray-500 dark:text-neutral-500">
                      cwelt@site.com
                    </span>
                  </div>
                </div>
              </div>
            </td>
            <td className="h-px w-72 whitespace-nowrap">
              <div className="px-6 py-3">
                <span className="block text-sm font-semibold text-gray-800 dark:text-neutral-200">
                  Designer
                </span>
                <span className="block text-sm text-gray-500 dark:text-neutral-500">
                  IT department
                </span>
              </div>
            </td>
            <td className="size-px whitespace-nowrap">
              <div className="px-6 py-3">
                <span className="py-1 px-1.5 inline-flex items-center gap-x-1 text-xs font-medium bg-teal-100 text-teal-800 rounded-full dark:bg-teal-500/10 dark:text-teal-500">
                  <svg
                    className="size-2.5"
                    xmlns="http://www.w3.org/2000/svg"
                    width="16"
                    height="16"
                    fill="currentColor"
                    viewBox="0 0 16 16"
                  >
                    <path d="M16 8A8 8 0 1 1 0 8a8 8 0 0 1 16 0zm-3.97-3.03a.75.75 0 0 0-1.08.022L7.477 9.417 5.384 7.323a.75.75 0 0 0-1.06 1.06L6.97 11.03a.75.75 0 0 0 1.079-.02l3.992-4.99a.75.75 0 0 0-.01-1.05z" />
                  </svg>
                  Active
                </span>
              </div>
            </td>
            <td className="size-px whitespace-nowrap">
              <div className="px-6 py-3">
                <div className="flex items-center gap-x-3">
                  <span className="text-xs text-gray-500 dark:text-neutral-500">
                    5/5
                  </span>
                  <div className="flex w-full h-1.5 bg-gray-200 rounded-full overflow-hidden dark:bg-neutral-700">
                    <div
                      className="flex flex-col justify-center overflow-hidden bg-gray-800 dark:bg-neutral-200"
                      role="progressbar"
                      style={{ width: "100%" }}
                      aria-valuenow="100"
                      aria-valuemin="0"
                      aria-valuemax="100"
                    ></div>
                  </div>
                </div>
              </div>
            </td>
            <td className="size-px whitespace-nowrap">
              <div className="px-6 py-3">
                <span className="text-sm text-gray-500 dark:text-neutral-500">
                  18 Dec, 15:20
                </span>
              </div>
            </td>
            <td className="size-px whitespace-nowrap">
              <div className="px-6 py-1.5">
                <a
                  className="inline-flex items-center gap-x-1 text-sm text-blue-600 decoration-2 hover:underline font-medium dark:text-blue-500"
                  href="#"
                >
                  Edit
                </a>
              </div>
            </td>
          </tr>

          <tr>
            <td className="size-px whitespace-nowrap">
              <div className="ps-6 py-3">
                <label htmlFor="hs-at-with-checkboxes-10" className="flex">
                  <input
                    type="checkbox"
                    className="shrink-0 border-gray-300 rounded text-blue-600 focus:ring-blue-500 disabled:opacity-50 disabled:pointer-events-none dark:bg-neutral-800 dark:border-neutral-600 dark:checked:bg-blue-500 dark:checked:border-blue-500 dark:focus:ring-offset-gray-800"
                    id="hs-at-with-checkboxes-10"
                  />
                  <span className="sr-only">Checkbox</span>
                </label>
              </div>
            </td>
            <td className="size-px whitespace-nowrap">
              <div className="ps-6 lg:ps-3 xl:ps-0 pe-6 py-3">
                <div className="flex items-center gap-x-3">
                  <img
                    className="inline-block size-[38px] rounded-full"
                    src="https://images.unsplash.com/photo-1568602471122-7832951cc4c5?ixlib=rb-4.0.3&ixid=MnwxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8&auto=format&fit=facearea&facepad=2&w=300&h=300&q=80"
                    alt="Image Description"
                  />
                  <div className="grow">
                    <span className="block text-sm font-semibold text-gray-800 dark:text-neutral-200">
                      Oliver Schevich
                    </span>
                    <span className="block text-sm text-gray-500 dark:text-neutral-500">
                      oliver@site.com
                    </span>
                  </div>
                </div>
              </div>
            </td>
            <td className="h-px w-72 whitespace-nowrap">
              <div className="px-6 py-3">
                <span className="block text-sm font-semibold text-gray-800 dark:text-neutral-200">
                  Seller
                </span>
                <span className="block text-sm text-gray-500 dark:text-neutral-500">
                  Branding products
                </span>
              </div>
            </td>
            <td className="size-px whitespace-nowrap">
              <div className="px-6 py-3">
                <span className="py-1 px-1.5 inline-flex items-center gap-x-1 text-xs font-medium bg-yellow-100 text-yellow-800 rounded-full dark:bg-yellow-500/10 dark:text-yellow-500">
                  <svg
                    className="size-2.5"
                    xmlns="http://www.w3.org/2000/svg"
                    width="16"
                    height="16"
                    fill="currentColor"
                    viewBox="0 0 16 16"
                  >
                    <path d="M8.982 1.566a1.13 1.13 0 0 0-1.96 0L.165 13.233c-.457.778.091 1.767.98 1.767h13.713c.889 0 1.438-.99.98-1.767L8.982 1.566zM8 5c.535 0 .954.462.9.995l-.35 3.507a.552.552 0 0 1-1.1 0L7.1 5.995A.905.905 0 0 1 8 5zm.002 6a1 1 0 1 1 0 2 1 1 0 0 1 0-2z" />
                  </svg>
                  Warning
                </span>
              </div>
            </td>
            <td className="size-px whitespace-nowrap">
              <div className="px-6 py-3">
                <div className="flex items-center gap-x-3">
                  <span className="text-xs text-gray-500 dark:text-neutral-500">
                    3/5
                  </span>
                  <div className="flex w-full h-1.5 bg-gray-200 rounded-full overflow-hidden dark:bg-neutral-700">
                    <div
                      className="flex flex-col justify-center overflow-hidden bg-gray-800 dark:bg-neutral-200"
                      role="progressbar"
                      style={{ width: "78%" }}
                      aria-valuenow="78"
                      aria-valuemin="0"
                      aria-valuemax="100"
                    ></div>
                  </div>
                </div>
              </div>
            </td>
            <td className="size-px whitespace-nowrap">
              <div className="px-6 py-3">
                <span className="text-sm text-gray-500 dark:text-neutral-500">
                  20 Dec, 09:27
                </span>
              </div>
            </td>
            <td className="size-px whitespace-nowrap">
              <div className="px-6 py-1.5">
                <a
                  className="inline-flex items-center gap-x-1 text-sm text-blue-600 decoration-2 hover:underline font-medium dark:text-blue-500"
                  href="#"
                >
                  Edit
                </a>
              </div>
            </td>
          </tr>

          <tr>
            <td className="size-px whitespace-nowrap">
              <div className="ps-6 py-3">
                <label htmlFor="hs-at-with-checkboxes-11" className="flex">
                  <input
                    type="checkbox"
                    className="shrink-0 border-gray-300 rounded text-blue-600 focus:ring-blue-500 disabled:opacity-50 disabled:pointer-events-none dark:bg-neutral-800 dark:border-neutral-600 dark:checked:bg-blue-500 dark:checked:border-blue-500 dark:focus:ring-offset-gray-800"
                    id="hs-at-with-checkboxes-11"
                  />
                  <span className="sr-only">Checkbox</span>
                </label>
              </div>
            </td>
            <td className="size-px whitespace-nowrap">
              <div className="ps-6 lg:ps-3 xl:ps-0 pe-6 py-3">
                <div className="flex items-center gap-x-3">
                  <span className="inline-flex items-center justify-center size-[38px] rounded-full bg-white border border-gray-300 dark:bg-neutral-800 dark:border-neutral-700">
                    <span className="font-medium text-sm text-gray-800 leading-none dark:text-neutral-200">
                      I
                    </span>
                  </span>
                  <div className="grow">
                    <span className="block text-sm font-semibold text-gray-800 dark:text-neutral-200">
                      Inna Ivy
                    </span>
                    <span className="block text-sm text-gray-500 dark:text-neutral-500">
                      invy@site.com
                    </span>
                  </div>
                </div>
              </div>
            </td>
            <td className="h-px w-72 whitespace-nowrap">
              <div className="px-6 py-3">
                <span className="block text-sm font-semibold text-gray-800 dark:text-neutral-200">
                  Designer
                </span>
                <span className="block text-sm text-gray-500 dark:text-neutral-500">
                  IT department
                </span>
              </div>
            </td>
            <td className="size-px whitespace-nowrap">
              <div className="px-6 py-3">
                <span className="py-1 px-1.5 inline-flex items-center gap-x-1 text-xs font-medium bg-teal-100 text-teal-800 rounded-full dark:bg-teal-500/10 dark:text-teal-500">
                  <svg
                    className="size-2.5"
                    xmlns="http://www.w3.org/2000/svg"
                    width="16"
                    height="16"
                    fill="currentColor"
                    viewBox="0 0 16 16"
                  >
                    <path d="M16 8A8 8 0 1 1 0 8a8 8 0 0 1 16 0zm-3.97-3.03a.75.75 0 0 0-1.08.022L7.477 9.417 5.384 7.323a.75.75 0 0 0-1.06 1.06L6.97 11.03a.75.75 0 0 0 1.079-.02l3.992-4.99a.75.75 0 0 0-.01-1.05z" />
                  </svg>
                  Active
                </span>
              </div>
            </td>
            <td className="size-px whitespace-nowrap">
              <div className="px-6 py-3">
                <div className="flex items-center gap-x-3">
                  <span className="text-xs text-gray-500 dark:text-neutral-500">
                    5/5
                  </span>
                  <div className="flex w-full h-1.5 bg-gray-200 rounded-full overflow-hidden dark:bg-neutral-700">
                    <div
                      className="flex flex-col justify-center overflow-hidden bg-gray-800 dark:bg-neutral-200"
                      role="progressbar"
                      style={{ width: "100%" }}
                      aria-valuenow="100"
                      aria-valuemin="0"
                      aria-valuemax="100"
                    ></div>
                  </div>
                </div>
              </div>
            </td>
            <td className="size-px whitespace-nowrap">
              <div className="px-6 py-3">
                <span className="text-sm text-gray-500 dark:text-neutral-500">
                  18 Dec, 15:20
                </span>
              </div>
            </td>
            <td className="size-px whitespace-nowrap">
              <div className="px-6 py-1.5">
                <a
                  className="inline-flex items-center gap-x-1 text-sm text-blue-600 decoration-2 hover:underline font-medium dark:text-blue-500"
                  href="#"
                >
                  Edit
                </a>
              </div>
            </td>
          </tr>

          <tr>
            <td className="size-px whitespace-nowrap">
              <div className="ps-6 py-3">
                <label htmlFor="hs-at-with-checkboxes-12" className="flex">
                  <input
                    type="checkbox"
                    className="shrink-0 border-gray-300 rounded text-blue-600 focus:ring-blue-500 disabled:opacity-50 disabled:pointer-events-none dark:bg-neutral-800 dark:border-neutral-600 dark:checked:bg-blue-500 dark:checked:border-blue-500 dark:focus:ring-offset-gray-800"
                    id="hs-at-with-checkboxes-12"
                  />
                  <span className="sr-only">Checkbox</span>
                </label>
              </div>
            </td>
            <td className="size-px whitespace-nowrap">
              <div className="ps-6 lg:ps-3 xl:ps-0 pe-6 py-3">
                <div className="flex items-center gap-x-3">
                  <img
                    className="inline-block size-[38px] rounded-full"
                    src="https://images.unsplash.com/photo-1670272505340-d906d8d77d03?ixlib=rb-4.0.3&ixid=MnwxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8&auto=format&fit=facearea&facepad=2&w=320&h=320&q=80"
                    alt="Image Description"
                  />
                  <div className="grow">
                    <span className="block text-sm font-semibold text-gray-800 dark:text-neutral-200">
                      Jessica Williams
                    </span>
                    <span className="block text-sm text-gray-500 dark:text-neutral-500">
                      myhairisred@site.com
                    </span>
                  </div>
                </div>
              </div>
            </td>
            <td className="h-px w-72 whitespace-nowrap">
              <div className="px-6 py-3">
                <span className="block text-sm font-semibold text-gray-800 dark:text-neutral-200">
                  Executive director
                </span>
                <span className="block text-sm text-gray-500 dark:text-neutral-500">
                  Marketing
                </span>
              </div>
            </td>
            <td className="size-px whitespace-nowrap">
              <div className="px-6 py-3">
                <span className="py-1 px-1.5 inline-flex items-center gap-x-1 text-xs font-medium bg-teal-100 text-teal-800 rounded-full dark:bg-teal-500/10 dark:text-teal-500">
                  <svg
                    className="size-2.5"
                    xmlns="http://www.w3.org/2000/svg"
                    width="16"
                    height="16"
                    fill="currentColor"
                    viewBox="0 0 16 16"
                  >
                    <path d="M16 8A8 8 0 1 1 0 8a8 8 0 0 1 16 0zm-3.97-3.03a.75.75 0 0 0-1.08.022L7.477 9.417 5.384 7.323a.75.75 0 0 0-1.06 1.06L6.97 11.03a.75.75 0 0 0 1.079-.02l3.992-4.99a.75.75 0 0 0-.01-1.05z" />
                  </svg>
                  Active
                </span>
              </div>
            </td>
            <td className="size-px whitespace-nowrap">
              <div className="px-6 py-3">
                <div className="flex items-center gap-x-3">
                  <span className="text-xs text-gray-500 dark:text-neutral-500">
                    0/5
                  </span>
                  <div className="flex w-full h-1.5 bg-gray-200 rounded-full overflow-hidden dark:bg-neutral-700">
                    <div
                      className="flex flex-col justify-center overflow-hidden bg-gray-800 dark:bg-neutral-200"
                      role="progressbar"
                      style={{ width: "1%" }}
                      aria-valuenow="1"
                      aria-valuemin="0"
                      aria-valuemax="100"
                    ></div>
                  </div>
                </div>
              </div>
            </td>
            <td className="size-px whitespace-nowrap">
              <div className="px-6 py-3">
                <span className="text-sm text-gray-500 dark:text-neutral-500">
                  18 Dec, 15:20
                </span>
              </div>
            </td>
            <td className="size-px whitespace-nowrap">
              <div className="px-6 py-1.5">
                <a
                  className="inline-flex items-center gap-x-1 text-sm text-blue-600 decoration-2 hover:underline font-medium dark:text-blue-500"
                  href="#"
                >
                  Edit
                </a>
              </div>
            </td>
          </tr>
        </tbody>
      </table>
      {/* <!-- End Table --> */}

      {/* <!-- Footer --> */}
      <div className="px-6 py-4 grid gap-3 md:flex md:justify-between md:items-center border-t border-gray-200 dark:border-neutral-700">
        <div>
          <p className="text-sm text-gray-600 dark:text-neutral-400">
            <span className="font-semibold text-gray-800 dark:text-neutral-200">
              12
            </span>{" "}
            results
          </p>
        </div>

        <div>
          <div className="inline-flex gap-x-2">
            <button
              type="button"
              className="py-1.5 px-2 inline-flex items-center gap-x-2 text-sm font-medium rounded-lg border border-gray-200 bg-white text-gray-800 shadow-sm hover:bg-gray-50 disabled:opacity-50 disabled:pointer-events-none dark:bg-neutral-800 dark:border-neutral-700 dark:text-white dark:hover:bg-neutral-800"
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
                <path d="m15 18-6-6 6-6" />
              </svg>
              Prev
            </button>

            <button
              type="button"
              className="py-1.5 px-2 inline-flex items-center gap-x-2 text-sm font-medium rounded-lg border border-gray-200 bg-white text-gray-800 shadow-sm hover:bg-gray-50 disabled:opacity-50 disabled:pointer-events-none dark:bg-neutral-800 dark:border-neutral-700 dark:text-white dark:hover:bg-neutral-800"
            >
              Next
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
                <path d="m9 18 6-6-6-6" />
              </svg>
            </button>
          </div>
        </div>
      </div>
      {/* <!-- End Footer --> */}
    </>
  );
}

export default UsersTable;
