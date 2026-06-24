import React, { useState, useEffect } from 'react'
import { useLocation } from 'react-router-dom'
import Sidebar from '../modules/dashboard/components/Sidebar'
import Navbar from '../modules/dashboard/components/Navbar'
import '../styles/ModulePage.css'

const PageShell = ({ children }) => {
  const [collapsed, setCollapsed] = useState(false)
  const [mobileOpen, setMobileOpen] = useState(false)
  const [activeModule, setActiveModule] = useState('overview')

  useEffect(() => {
    // keep window resize responsive behavior if needed
    const onResize = () => {
      if (window.innerWidth <= 1024) setCollapsed(false)
    }
    window.addEventListener('resize', onResize)
    return () => window.removeEventListener('resize', onResize)
  }, [])

  const location = useLocation()

  useEffect(() => {
    // derive active module from the current path so refresh keeps selection
    const seg = (location.pathname || '').split('/')[1]
    let module = 'overview'
    if (seg === 'crm') module = 'crm'
    else if (seg === 'hr') module = 'hr'
    else if (seg === 'tasks' || seg === 'task') module = 'tasks'
    else if (seg === 'accounts') module = 'accounts'
    else if (seg === 'dashboard' || seg === '') module = 'overview'
    setActiveModule(module)
  }, [location.pathname])

  return (
    <div className="dashboard-container">
      <Sidebar
        activeModule={activeModule}
        setActiveModule={setActiveModule}
        collapsed={collapsed}
        setCollapsed={setCollapsed}
        mobileOpen={mobileOpen}
        setMobileOpen={setMobileOpen}
        onLogout={() => window.location.href = '/login'}
      />

      <div className={`main-content ${collapsed ? 'collapsed' : ''}`}>
        <Navbar collapsed={collapsed} setCollapsed={setCollapsed} mobileOpen={mobileOpen} setMobileOpen={setMobileOpen} />

        <div className={`dashboard-content ${activeModule}`}>
          {children}
        </div>
      </div>
    </div>
  )
}

export default PageShell
