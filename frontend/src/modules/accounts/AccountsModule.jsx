import React, { useState, useEffect } from 'react'
import { useAuth } from '../../context/AuthContext'
import { useAccountsPermissions, AccountsPermissionsProvider } from './accountsPermissions'
import AccountsPage from './pages/AccountsPage'
import COAPage from './pages/COAPage'
import JournalsPage from './pages/JournalsPage'
import LedgerPage from './pages/LedgerPage'
import TransactionsPage from './pages/TransactionsPage'
import ARPage from './pages/ARPage'
import APPage from './pages/APPage'
import BudgetsPage from './pages/BudgetsPage'
import ReportsPage from './pages/ReportsPage'
import AIInsightsPage from './pages/AIInsightsPage'
import Loader from '../../components/ui/Loader'
import '../../styles/AccountsTheme.css'
import '../../styles/AccountsModule.css'

const pageComponents = {
  overview: AccountsPage,
  coa: COAPage,
  journals: JournalsPage,
  ledger: LedgerPage,
  transactions: TransactionsPage,
  ar: ARPage,
  ap: APPage,
  budgets: BudgetsPage,
  reports: ReportsPage,
  'ai-insights': AIInsightsPage,
}

const AccountsModuleContent = () => {
  const { user } = useAuth()
  const { department, profile, loading, allowedPages } = useAccountsPermissions()
  const [activePage, setActivePage] = useState('overview')

  useEffect(() => {
    if (!loading && allowedPages.length && !allowedPages.some((page) => page.id === activePage)) {
      setActivePage(allowedPages[0].id)
    }
  }, [loading, allowedPages, activePage])

  if (!user || loading) {
    return <Loader fullScreen={false} size={40} />
  }

  const ActiveComponent = pageComponents[activePage] || AccountsPage

  return (
    <div className="module-page">
      <div className="accounts-module-header">
        <div>
          <h1>Accounts</h1>
          <p>Department: {department.replace(/^[a-z]/, (c) => c.toUpperCase())}</p>
          {profile?.employee?.department_name && profile.employee.department_name.toLowerCase() !== department && (
            <p>Profile department: {profile.employee.department_name}</p>
          )}
        </div>
      </div>

      <div className="accounts-navigation" style={{ marginBottom: '16px' }}>
        {allowedPages.map((page) => (
          <button
            key={page.id}
            className={activePage === page.id ? 'active' : ''}
            onClick={() => setActivePage(page.id)}
          >
            {page.label}
          </button>
        ))}
      </div>

      <div className="accounts-page-wrapper">
        <ActiveComponent />
      </div>

      {allowedPages.length === 0 && (
        <div className="accounts-summary" style={{ marginTop: '16px' }}>
          <p>No Accounts pages are available for your department yet.</p>
        </div>
      )}
    </div>
  )
}

const AccountsModule = () => (
  <AccountsPermissionsProvider>
    <AccountsModuleContent />
  </AccountsPermissionsProvider>
)

export default AccountsModule
