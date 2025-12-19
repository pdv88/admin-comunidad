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
    <div className="relative">
      <div className="relative z-10">
        <Header/>
        <main>
          <Hero/>
          <Features/>
          <FAQs/>
          <Testimonials/>
          <Pricing/>
        </main>
        <Footer/>
      </div>
    </div>
  )
}

export default Home