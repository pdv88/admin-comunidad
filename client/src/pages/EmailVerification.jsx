import axios from "axios";
import React, { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { PulseLoader } from "react-spinners";
import Footer from "../assets/components/Footer";
import Header from "../assets/components/Header";
import { useTranslation } from "react-i18next";

function EmailVerification() {
  const url = import.meta.env.VITE_URL;
  const navigate = useNavigate();
  const { t } = useTranslation();

  const { token } = useParams();

  const [isVerified, setIsVerified] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!token) {
      setError(t('email_verification.no_token'));
      return;
    }
    setIsLoading(true);
    console.log(token);
    const data = { token: token };
    axios
      .put(url + "/verifyEmail", data)
      .then((result) => {
        if (result.data.status === "success") {
          setIsVerified(true);
        }
        if (result.data.status === "fail") {
          setError(t('email_verification.invalid_token'));
        }
      })
      .catch((err) => {
        console.log(err);
        setError(t('email_verification.error_title'));
      })
      .finally(() => {
        setIsLoading(false);
      });
  }, [token]);

  return (
    <>
      <Header />
      <section className="flex flex-col w-full items-center justify-center p-5">
        {isLoading ? (
          <div className="flex w-full min-h-[calc(100svh-4.5rem)] items-center justify-center">
            <PulseLoader color="#d3d3d3" size={15} className="p-1" />
          </div>
        ) : (
          <>
            {error && (
              <div className="flex justify-center items-center min-h-[calc(100svh-4.5rem)]">
                <div className="flex flex-col gap-5 bg-card p-5 rounded-3xl justify-center items-center">
                  <h2 className="text-3xl text-center">
                    {t('email_verification.error_title')}
                  </h2>
                  <p>{error}</p>
                </div>
              </div>
            )}
            {isVerified && (
              <div className="flex justify-center items-center min-h-[calc(100svh-4.5rem)]">
                <div className="flex flex-col gap-5 bg-card p-5 rounded-3xl justify-center items-center">
                  <h2 className="text-3xl text-center">
                    {t('email_verification.success_title')}
                  </h2>
                  <button
                    className="btn-primary rounded-full p-2 w-36"
                    onClick={() => navigate("/login")}
                  >
                    {t('email_verification.login_btn')}
                  </button>
                </div>
              </div>
            )}
          </>
        )}
      </section>
      <Footer />
    </>
  );
}

export default EmailVerification;
