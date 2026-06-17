import React, { useState, useEffect } from 'react'
import Sidebar from '../components/Sidebar'
import Navbar from '../components/Navbar'
import { useAuth } from '../../../context/AuthContext'
import { authAPI } from '../../../services/api'
import { LogOut, User, Mail, Shield } from 'lucide-react'
import Loader from '../../../components/ui/Loader'
import HRPage from '../../hr/pages/HRPage'
import AccountsPage from '../../accounts/pages/AccountsPage'
import TasksPage from '../../tasks/pages/TasksPage'
import CRMPage from '../../crm/pages/CRMPage'
import '../../../styles/Dashboard.css'

const Dashboard = () => {
  const { user, logout } = useAuth()
  const [dashboardData, setDashboardData] = useState(null)
  const [loading, setLoading] = useState(true)
  const [activeModule, setActiveModule] = useState('overview')
  const [collapsed, setCollapsed] = useState(false)
  const [mobileOpen, setMobileOpen] = useState(false)

  useEffect(() => {
    const fetchDashboard = async () => {
      try {
        const response = await authAPI.getDashboard()
        setDashboardData(response.data)
      } catch (error) {
        console.error('Failed to load dashboard:', error)
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
            <div className="module-section">
              <h2>HR Module</h2>
              <p>Human Resources management features coming soon...</p>
            </div>
          )}

          {activeModule === 'accounts' && <AccountsPage />}
          {activeModule === 'tasks' && <TasksPage />}
          {activeModule === 'crm' && <CRMPage />}
        </div>
      </div>
    </div>
  )
}

export default Dashboard
