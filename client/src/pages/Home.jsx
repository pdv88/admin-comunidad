import React from 'react'

import Header from '../assets/components/Header'
import Hero from '../assets/components/home/Hero'
import Features from '../assets/components/home/Features'
import FAQs from '../assets/components/home/FAQs'
import Pricing from '../assets/components/home/Pricing'
import Testimonials from '../assets/components/home/Testimonials'
import Footer from '../assets/components/Footer'

function Home() {
  return (
    <>
    <Header/>
    <Hero/>
    <Features/>
    <FAQs/>
    <Testimonials/>
    <Pricing/>
    <Footer/>
    </>
  )
}

export default Home