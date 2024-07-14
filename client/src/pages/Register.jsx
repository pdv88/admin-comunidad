import React from 'react'

import Header from '../assets/components/Header'
import Footer from '../assets/components/Footer'
import RegisterForm from '../assets/components/login/RegisterForm'

function Register() {
  return (
    <>
    <Header/>
    <section className='flex justify-center w-full items-center'>
      <RegisterForm/>
    </section>
    <Footer/>
    </>
  )
}

export default Register