import React, { useState, useEffect } from 'react'
import Sidebar from '../components/Sidebar'
import Navbar from '../components/Navbar'
import { useAuth } from '../../../context/AuthContext'
import { authAPI } from '../../../services/api'
import { User, Mail, Shield } from 'lucide-react'
import Loader from '../../../components/ui/Loader'
import HRPage from '../../hr/pages/HRPage'
import AccountsPage from '../../accounts/pages/AccountsPage'
import COAPage from '../../accounts/pages/COAPage'
import JournalsPage from '../../accounts/pages/JournalsPage'
import LedgerPage from '../../accounts/pages/LedgerPage'
import TransactionsPage from '../../accounts/pages/TransactionsPage'
import ARPage from '../../accounts/pages/ARPage'
import APPage from '../../accounts/pages/APPage'
import BudgetsPage from '../../accounts/pages/BudgetsPage'
import ReportsPage from '../../accounts/pages/ReportsPage'
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

          {activeModule === 'accounts' ? (
            <div>
              <div className="accounts-navigation">
                <button className={activeAccountPage === 'overview' ? 'active' : ''} onClick={() => setActiveAccountPage('overview')}>Overview</button>
                <button className={activeAccountPage === 'coa' ? 'active' : ''} onClick={() => setActiveAccountPage('coa')}>Chart of Accounts</button>
                <button className={activeAccountPage === 'journals' ? 'active' : ''} onClick={() => setActiveAccountPage('journals')}>Journals</button>
                <button className={activeAccountPage === 'ledger' ? 'active' : ''} onClick={() => setActiveAccountPage('ledger')}>Ledger</button>
                <button className={activeAccountPage === 'transactions' ? 'active' : ''} onClick={() => setActiveAccountPage('transactions')}>Transactions</button>
                <button className={activeAccountPage === 'ar' ? 'active' : ''} onClick={() => setActiveAccountPage('ar')}>Accounts Receivable</button>
                <button className={activeAccountPage === 'ap' ? 'active' : ''} onClick={() => setActiveAccountPage('ap')}>Accounts Payable</button>
                <button className={activeAccountPage === 'budgets' ? 'active' : ''} onClick={() => setActiveAccountPage('budgets')}>Budgets</button>
                <button className={activeAccountPage === 'reports' ? 'active' : ''} onClick={() => setActiveAccountPage('reports')}>Reports</button>
              </div>
              <div className="accounts-page-wrapper">
                {activeAccountPage === 'overview' && <AccountsPage />}
                {activeAccountPage === 'coa' && <COAPage />}
                {activeAccountPage === 'journals' && <JournalsPage />}
                {activeAccountPage === 'ledger' && <LedgerPage />}
                {activeAccountPage === 'transactions' && <TransactionsPage />}
                {activeAccountPage === 'ar' && <ARPage />}
                {activeAccountPage === 'ap' && <APPage />}
                {activeAccountPage === 'budgets' && <BudgetsPage />}
                {activeAccountPage === 'reports' && <ReportsPage />}
              </div>
            </div>
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
