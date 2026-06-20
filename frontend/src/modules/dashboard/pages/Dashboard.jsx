import React, { useState, useEffect } from 'react'
import Sidebar from '../components/Sidebar'
import Navbar from '../components/Navbar'
import { useAuth } from '../../../context/AuthContext'
import { useAccountsPermissions } from '../../accounts/accountsPermissions'
import { authAPI } from '../../../services/api'
import { User, Mail, Shield } from 'lucide-react'
import Loader from '../../../components/ui/Loader'
import HRPage from '../../hr/pages/HRPage'
import EmployeeDashboard from '../../hr/pages/EmployeeDashboard'
import AccountsModule from '../../accounts/AccountsModule'
import TasksPage from '../../tasks/pages/TasksPage'
import CRMPage from '../../crm/pages/CRMPage'
import '../../../styles/Dashboard.css'
import '../../../styles/AccountsModule.css'
import '../../../styles/AccountsTheme.css'

const Dashboard = () => {
  const { user, logout } = useAuth()
  const [loading, setLoading] = useState(true)
  const [activeModule, setActiveModule] = useState('overview')
  const [activeAccountPage, setActiveAccountPage] = useState('overview')
  const [collapsed, setCollapsed] = useState(false)
  const [mobileOpen, setMobileOpen] = useState(false)

  useEffect(() => {
    const fetchDashboard = async () => {
      try {
          await authAPI.getDashboard()
      } finally {
        setLoading(false)
      }
    }

    fetchDashboard()
  }, [])

  const handleLogout = () => {
    logout()
  }

  if (loading) {
    return <Loader fullScreen={true} size={50} />
  }

  return (
    <div className="dashboard-container">
      <Sidebar
        activeModule={activeModule}
        setActiveModule={setActiveModule}
        collapsed={collapsed}
        setCollapsed={setCollapsed}
        mobileOpen={mobileOpen}
        setMobileOpen={setMobileOpen}
        onLogout={handleLogout}
        useLinks={true}
      />

      <div className={`main-content ${collapsed ? 'collapsed' : ''}`}>
        <Navbar collapsed={collapsed} setCollapsed={setCollapsed} mobileOpen={mobileOpen} setMobileOpen={setMobileOpen} user={user} />

        <div className="dashboard-content">
          {activeModule === 'overview' && (
            <div className="module-section">
              <h2>Welcome to Business Suite</h2>
              <div className="welcome-message">
                <p>
                  <User size={16} style={{ display: 'inline', marginRight: '8px', verticalAlign: 'text-bottom' }} />
                  You are logged in as <strong>{user?.username}</strong>
                </p>
                <p>
                  <Mail size={16} style={{ display: 'inline', marginRight: '8px', verticalAlign: 'text-bottom' }} />
                  Email: <strong>{user?.email}</strong>
                </p>
                {user?.is_admin && (
                  <p>
                    <Shield size={16} style={{ display: 'inline', marginRight: '8px', verticalAlign: 'text-bottom' }} />
                    You have <strong>Admin privileges</strong>
                  </p>
                )}
                <p style={{ marginTop: '16px' }}>Select a module from the sidebar to get started.</p>
              </div>
            </div>
          )}

          {activeModule === 'hr' && (
            <>
              {user?.is_admin ? <HRPage /> : <EmployeeDashboard />}
            </>
          )}

          {activeModule === 'accounts' ? (
            <AccountsModule />
          ) : (
            <>
              {activeModule === 'tasks' && <TasksPage />}
              {activeModule === 'crm' && <CRMPage />}
            </>
          )}
        </div>
      </div>
    </div>
  )
}

export default Dashboard
