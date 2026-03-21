import React, { useEffect } from 'react'
import Navbar from './components/Navbar'
import { Outlet } from 'react-router'
import Footer from './components/Footer'
import { resetAdminMetaTags } from './utils/seo'

function Layout() {
  useEffect(() => {
    // Reset to admin default meta tags on mount
    resetAdminMetaTags();
  }, [])

  return (
    <>
      <Navbar />
      <Outlet />
      <Footer />
    </>
  )
}

export default Layout