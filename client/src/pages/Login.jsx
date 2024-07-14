import React from 'react'
import Auth from '../assets/components/login/Auth'
import Header from '../assets/components/Header'
import Footer from '../assets/components/Footer'

function Login() {
  return (
    <>
      <Header />
      <section className='flex justify-center w-full items-center'>
        <Auth />
      </section >
      <Footer />
    </>
  )
}

export default Login