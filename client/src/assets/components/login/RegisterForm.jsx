import React, { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import axios from "axios";
import { PulseLoader } from "react-spinners";

import { API_URL } from "../../config";

function RegisterForm() {

  document.title = "Register | VIDEAPP";

  const url = API_URL;

  const [isRegisterLoading, setIsRegisterLoading] = useState(false);
  const [correoEnviado, setCorreoEnviado] = useState(false);
  const [isButtonDisabled, setIsButtonDisabled] = useState(false);
  const [register, setRegister] = useState({
    name: "",
    lastname: "",
    password: "",
    confirmPassword: "",
    mail: "",
  });

  function handleChange(e) {
    setRegister({ ...register, [e.target.name]: e.target.value });
  }

  const [errors, setErrors] = useState({});

  function validate(values) {
    let errors = {};
    if (!values.name) {
      errors.name = "Introduce nombre";
    }
    if (!values.lastname) {
      errors.lastname = "Introduce apellidos";
    }
    if (!values.mail) {
      errors.mail = "Introduce email";
    } else if (!/\S+@\S+\.\S+/.test(values.mail)) {
      errors.mail = "Email no vaido";
    }
    if (!values.password) {
      errors.password = "Introduce contraseña";
    } else if (
      !/^(?=.*[A-Za-z])(?=.*\d)[A-Za-z\d]{8,}$/.test(values.password)
    ) {
      errors.password =
        "Minimo 8 caracteres, por lo menos una letra y un numero";
    }

    if (!values.confirmPassword) {
      errors.confirmPassword = "Confirma contraseña";
    } else if (values.password !== values.confirmPassword) {
      errors.confirmPassword = "Contraseñas no coinciden";
    }
    return errors;
  }

  function handleRegister(e) {
    e.preventDefault();
    const errors = validate(register);
    setErrors(errors);
    if (Object.keys(errors).length === 0) {
      setIsRegisterLoading(true);
      axios.post(`${API_URL}/api/auth/register`, register).then((result) => {
        if (result.data.status === "success") {
          setCorreoEnviado(true);
        } else if (result.data.status === "email ya en uso") {
          setErrors({ ...errors, mail: "Email ya en uso" });
        }
      }).finally(() => {
        setIsRegisterLoading(false);
      });
    }
  }

  function handleResendToken() {
    setIsButtonDisabled(true);
    axios.post(`${API_URL}/api/auth/resend-verification`, { email: register.mail }).then((result) => {
      if (result.data.status === "success") {

      }
    }).catch((err) => {
      console.log(err);
    }
    ).finally(() => {
      setTimeout(() => {
        setIsButtonDisabled(false);
      }, 30000);
    })
  }

  return (
    <>
      <div className="mt-7 bg-white border border-gray-200 rounded-xl shadow-sm dark:bg-neutral-900 dark:border-neutral-700">
        <div className="p-4 sm:p-7">
          <div className="text-center">
            <h1 className="block text-2xl font-bold text-gray-800 dark:text-white">
              Registrate
            </h1>
            <p className="mt-2 text-sm text-gray-600 dark:text-neutral-400">
              ¿Tienes una cuenta?
              <Link
                to={"/login"}
                className="text-blue-600 decoration-2 hover:underline font-medium dark:text-blue-500"
                href="../examples/html/signin.html"
              >
                Inicia sesión aquí
              </Link>
            </p>
          </div>

          <div className="mt-5">
            {/* <button
              type="button"
              className="w-full py-3 px-4 inline-flex justify-center items-center gap-x-2 text-sm font-medium rounded-lg border border-gray-200 bg-white text-gray-800 shadow-sm hover:bg-gray-50 disabled:opacity-50 disabled:pointer-events-none dark:bg-neutral-900 dark:border-neutral-700 dark:text-white dark:hover:bg-neutral-800"
            >
              <svg
                className="w-4 h-auto"
                width="46"
                height="47"
                viewBox="0 0 46 47"
                fill="none"
              >
                <path
                  d="M46 24.0287C46 22.09 45.8533 20.68 45.5013 19.2112H23.4694V27.9356H36.4069C36.1429 30.1094 34.7347 33.37 31.5957 35.5731L31.5663 35.8669L38.5191 41.2719L38.9885 41.3306C43.4477 37.2181 46 31.1669 46 24.0287Z"
                  fill="#4285F4"
                />
                <path
                  d="M23.4694 47C29.8061 47 35.1161 44.9144 39.0179 41.3012L31.625 35.5437C29.6301 36.9244 26.9898 37.8937 23.4987 37.8937C17.2793 37.8937 12.0281 33.7812 10.1505 28.1412L9.88649 28.1706L2.61097 33.7812L2.52296 34.0456C6.36608 41.7125 14.287 47 23.4694 47Z"
                  fill="#34A853"
                />
                <path
                  d="M10.1212 28.1413C9.62245 26.6725 9.32908 25.1156 9.32908 23.5C9.32908 21.8844 9.62245 20.3275 10.0918 18.8588V18.5356L2.75765 12.8369L2.52296 12.9544C0.909439 16.1269 0 19.7106 0 23.5C0 27.2894 0.909439 30.8731 2.49362 34.0456L10.1212 28.1413Z"
                  fill="#FBBC05"
                />
                <path
                  d="M23.4694 9.07688C27.8699 9.07688 30.8622 10.9863 32.5344 12.5725L39.1645 6.11C35.0867 2.32063 29.8061 0 23.4694 0C14.287 0 6.36607 5.2875 2.49362 12.9544L10.0918 18.8588C11.9987 13.1894 17.25 9.07688 23.4694 9.07688Z"
                  fill="#EB4335"
                />
              </svg>
              Sign up with Google
            </button>

            <div className="py-3 flex items-center text-xs text-gray-400 uppercase before:flex-1 before:border-t before:border-gray-200 before:me-6 after:flex-1 after:border-t after:border-gray-200 after:ms-6 dark:text-neutral-500 dark:before:border-neutral-600 dark:after:border-neutral-600">
              Or
            </div> */}

            {/* <!-- Form --> */}
            <form onSubmit={handleRegister}>
              <div className="grid gap-y-4">
                {/* <!-- input nombre --> */}
                <div>
                  <label
                    htmlFor="name"
                    className="block text-sm mb-2 dark:text-white"
                  >
                    Nombre
                  </label>
                  <div className="relative">
                    <input
                      type="name"
                      id="name"
                      name="name"
                      className="py-3 px-4 block w-full border-gray-200 rounded-lg text-sm focus:border-blue-500 focus:ring-blue-500 disabled:opacity-50 disabled:pointer-events-none dark:bg-neutral-900 dark:border-neutral-700 dark:text-neutral-400 dark:placeholder-neutral-500 dark:focus:ring-neutral-600"
                      required
                      aria-describedby="name-error"
                      onChange={handleChange}
                      value={register.name}
                    />
                    <div className="hidden absolute inset-y-0 end-0 pointer-events-none pe-3">
                      <svg
                        className="size-5 text-red-500"
                        width="16"
                        height="16"
                        fill="currentColor"
                        viewBox="0 0 16 16"
                        aria-hidden="true"
                      >
                        <path d="M16 8A8 8 0 1 1 0 8a8 8 0 0 1 16 0zM8 4a.905.905 0 0 0-.9.995l.35 3.507a.552.552 0 0 0 1.1 0l.35-3.507A.905.905 0 0 0 8 4zm.002 6a1 1 0 1 0 0 2 1 1 0 0 0 0-2z" />
                      </svg>
                    </div>
                  </div>
                  {errors.name &&
                    <p
                      className="hidden text-xs text-red-600 mt-2"
                      id="name-error"
                    >
                      {errors.name}
                    </p>}
                </div>
                {/* <!-- End Form Group --> */}

                {/* <!-- Input Apellidos --> */}
                <div>
                  <label
                    htmlFor="lastname"
                    className="block text-sm mb-2 dark:text-white"
                  >
                    Apellidos
                  </label>
                  <div className="relative">
                    <input
                      type="lastname"
                      id="lastname"
                      name="lastname"
                      className="py-3 px-4 block w-full border-gray-200 rounded-lg text-sm focus:border-blue-500 focus:ring-blue-500 disabled:opacity-50 disabled:pointer-events-none dark:bg-neutral-900 dark:border-neutral-700 dark:text-neutral-400 dark:placeholder-neutral-500 dark:focus:ring-neutral-600"
                      required
                      aria-describedby="lastname-error"
                      onChange={handleChange}
                      value={register.lastname}
                    />
                    <div className="hidden absolute inset-y-0 end-0 pointer-events-none pe-3">
                      <svg
                        className="size-5 text-red-500"
                        width="16"
                        height="16"
                        fill="currentColor"
                        viewBox="0 0 16 16"
                        aria-hidden="true"
                      >
                        <path d="M16 8A8 8 0 1 1 0 8a8 8 0 0 1 16 0zM8 4a.905.905 0 0 0-.9.995l.35 3.507a.552.552 0 0 0 1.1 0l.35-3.507A.905.905 0 0 0 8 4zm.002 6a1 1 0 1 0 0 2 1 1 0 0 0 0-2z" />
                      </svg>
                    </div>
                  </div>
                  {errors.lastname &&
                    <p
                      className="hidden text-xs text-red-600 mt-2"
                      id="name-error"
                    >
                      {errors.lastname}
                    </p>}
                </div>
                {/* <!-- End Form Group --> */}

                {/* <!-- Form Group --> */}
                <div>
                  <label
                    htmlFor="mail"
                    className="block text-sm mb-2 dark:text-white"
                  >
                    Correo
                  </label>
                  <div className="relative">
                    <input
                      type="mail"
                      id="mail"
                      name="mail"
                      className="py-3 px-4 block w-full border-gray-200 rounded-lg text-sm focus:border-blue-500 focus:ring-blue-500 disabled:opacity-50 disabled:pointer-events-none dark:bg-neutral-900 dark:border-neutral-700 dark:text-neutral-400 dark:placeholder-neutral-500 dark:focus:ring-neutral-600"
                      required
                      aria-describedby="mail-error"
                      onChange={handleChange}
                      value={register.mail}
                    />
                    <div className="hidden absolute inset-y-0 end-0 pointer-events-none pe-3">
                      <svg
                        className="size-5 text-red-500"
                        width="16"
                        height="16"
                        fill="currentColor"
                        viewBox="0 0 16 16"
                        aria-hidden="true"
                      >
                        <path d="M16 8A8 8 0 1 1 0 8a8 8 0 0 1 16 0zM8 4a.905.905 0 0 0-.9.995l.35 3.507a.552.552 0 0 0 1.1 0l.35-3.507A.905.905 0 0 0 8 4zm.002 6a1 1 0 1 0 0 2 1 1 0 0 0 0-2z" />
                      </svg>
                    </div>
                  </div>
                  {errors.mail &&
                    <p
                      className="hidden text-xs text-red-600 mt-2"
                      id="email-error"
                    >
                      {errors.mail}
                    </p>}
                </div>
                {/* <!-- End Form Group --> */}

                {/* <!-- Form Group --> */}
                <div>
                  <label
                    htmlFor="password"
                    className="block text-sm mb-2 dark:text-white"
                  >
                    Contraseña
                  </label>
                  <div className="relative">
                    <input
                      type="password"
                      id="password"
                      name="password"
                      className="py-3 px-4 block w-full border-gray-200 rounded-lg text-sm focus:border-blue-500 focus:ring-blue-500 disabled:opacity-50 disabled:pointer-events-none dark:bg-neutral-900 dark:border-neutral-700 dark:text-neutral-400 dark:placeholder-neutral-500 dark:focus:ring-neutral-600"
                      required
                      aria-describedby="password-error"
                      onChange={handleChange}
                      value={register.password}
                    />
                    <div className="hidden absolute inset-y-0 end-0 pointer-events-none pe-3">
                      <svg
                        className="size-5 text-red-500"
                        width="16"
                        height="16"
                        fill="currentColor"
                        viewBox="0 0 16 16"
                        aria-hidden="true"
                      >
                        <path d="M16 8A8 8 0 1 1 0 8a8 8 0 0 1 16 0zM8 4a.905.905 0 0 0-.9.995l.35 3.507a.552.552 0 0 0 1.1 0l.35-3.507A.905.905 0 0 0 8 4zm.002 6a1 1 0 1 0 0 2 1 1 0 0 0 0-2z" />
                      </svg>
                    </div>
                  </div>
                  {errors.password &&
                    <p
                      className="hidden text-xs text-red-600 mt-2"
                      id="password-error"
                    >
                      {errors.password}
                    </p>}
                </div>
                {/* <!-- End Form Group --> */}

                {/* <!-- Form Group --> */}
                <div>
                  <label
                    htmlFor="confirmPassword"
                    className="block text-sm mb-2 dark:text-white"
                  >
                    Confirma Contraseña
                  </label>
                  <div className="relative">
                    <input
                      type="password"
                      id="confirmPassword"
                      name="confirmPassword"
                      className="py-3 px-4 block w-full border-gray-200 rounded-lg text-sm focus:border-blue-500 focus:ring-blue-500 disabled:opacity-50 disabled:pointer-events-none dark:bg-neutral-900 dark:border-neutral-700 dark:text-neutral-400 dark:placeholder-neutral-500 dark:focus:ring-neutral-600"
                      required
                      aria-describedby="confirmPassword-error"
                      onChange={handleChange}
                      value={register.confirmPassword}
                    />
                    <div className="hidden absolute inset-y-0 end-0 pointer-events-none pe-3">
                      <svg
                        className="size-5 text-red-500"
                        width="16"
                        height="16"
                        fill="currentColor"
                        viewBox="0 0 16 16"
                        aria-hidden="true"
                      >
                        <path d="M16 8A8 8 0 1 1 0 8a8 8 0 0 1 16 0zM8 4a.905.905 0 0 0-.9.995l.35 3.507a.552.552 0 0 0 1.1 0l.35-3.507A.905.905 0 0 0 8 4zm.002 6a1 1 0 1 0 0 2 1 1 0 0 0 0-2z" />
                      </svg>
                    </div>
                  </div>
                  {errors.confirmPassword &&
                    <p
                      className="hidden text-xs text-red-600 mt-2"
                      id="confirmPassword-error"
                    >
                      {errors.confirmPassword}
                    </p>}
                </div>
                {/* <!-- End Form Group --> */}

                {/* <!-- Checkbox --> */}
                <div className="flex items-center">
                  <div className="flex">
                    <input
                      id="remember-me"
                      name="remember-me"
                      type="checkbox"
                      className="shrink-0 mt-0.5 border-gray-200 rounded text-blue-600 focus:ring-blue-500 dark:bg-neutral-800 dark:border-neutral-700 dark:checked:bg-blue-500 dark:checked:border-blue-500 dark:focus:ring-offset-gray-800"
                    />
                  </div>
                  <div className="ms-3">
                    <label
                      htmlFor="remember-me"
                      className="text-sm dark:text-white"
                    >
                      Acepto los {" "}
                      <Link
                        className="text-blue-600 decoration-2 hover:underline font-medium dark:text-blue-500"
                        to={"/terminos"}
                      >
                        Terminos y condiciones
                      </Link>
                    </label>
                  </div>
                </div>
                {/* <!-- End Checkbox --> */}

                {isRegisterLoading ? (
                  <button
                    className="w-full py-3 px-4 inline-flex justify-center items-center gap-x-2 text-sm font-semibold rounded-lg border border-transparent bg-blue-600 text-white hover:bg-blue-700 disabled:opacity-50 disabled:pointer-events-none"
                  >
                    <PulseLoader color="#1c2326" size={10} className="p-1" />
                  </button>
                ) : (
                  <button
                    type="submit"
                    className="w-full py-3 px-4 inline-flex justify-center items-center gap-x-2 text-sm font-semibold rounded-lg border border-transparent bg-blue-600 text-white hover:bg-blue-700 disabled:opacity-50 disabled:pointer-events-none"
                  >
                    Registrarme
                  </button>)}
              </div>
            </form>
            {/* <!-- End Form --> */}
          </div>
        </div>
      </div>
    </>
  );
}

export default RegisterForm;
