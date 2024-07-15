import axios from "axios";
import React, { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { PulseLoader } from "react-spinners";
import Footer from "../assets/components/Footer";
import Header from "../assets/components/Header";

function EmailVerification() {
  const url = import.meta.env.VITE_URL;
  const navigate = useNavigate();

  const { token } = useParams();

  const [isVerified, setIsVerified] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    document.title = "Verificación de Email | VIDEAPP";
    if (!token) {
      setError("No se encontró Token");
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
          setError("Token inválido");
        }
      })
      .catch((err) => {
        console.log(err);
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
                    Error al verificar correo
                  </h2>
                  <p>{error}</p>
                </div>
              </div>
            )}
            {isVerified && (
              <div className="flex justify-center items-center min-h-[calc(100svh-4.5rem)]">
                <div className="flex flex-col gap-5 bg-card p-5 rounded-3xl justify-center items-center">
                  <h2 className="text-3xl text-center">
                    Correo verificado con éxito
                  </h2>
                  <button
                    className="btn-primary rounded-full p-2 w-36"
                    onClick={() => navigate("/login")}
                  >
                    Login
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
