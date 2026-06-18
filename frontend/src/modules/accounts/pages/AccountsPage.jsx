import React, { useEffect, useState } from 'react'
import '../../../styles/ModulePage.css'
import { accountsAPI } from '../../../services/api'
import Loader from '../../../components/ui/Loader'

const AccountsPage = () => {
  const [status, setStatus] = useState(null)

  useEffect(() => {
    const fetchStatus = async () => {
      try {
        const response = await accountsAPI.getStatus()
        setStatus(response.data)
      } catch (error) {
        setStatus({ error: 'Unable to load accounts status' })
      }
    }

    fetchStatus()
  }, [])

  return (
    <div className="module-page">
      <h2>Accounts Overview</h2>
      <p>Use the tabs above to manage the chart of accounts, journal entries, ledger activity, AR/AP, budgets, and reports.</p>
      <div className="accounts-summary">
        <h3>Module Status</h3>
        {status ? (
          <div>
            <p><strong>Status:</strong> {status.status || 'Unknown'}</p>
            {status.tenant_id && <p><strong>Tenant ID:</strong> {status.tenant_id}</p>}
          </div>
        ) : (
          <Loader size={24} />
        )}
      </div>
      <div className="accounts-summary" style={{ marginTop: '24px' }}>
        <h3>Getting Started</h3>
        <ul>
          <li>Create and maintain your Chart of Accounts.</li>
          <li>Post journal entries to the ledger.</li>
          <li>Track customer invoices and vendor bills.</li>
          <li>Configure budgets and review reports.</li>
        </ul>
      </div>
    </div>
  )
}

export default AccountsPage
