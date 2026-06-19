import React, { useEffect, useState } from 'react'
import '../../../styles/ModulePage.css'
import '../styles/AccountsPage.css'
import { accountsAPI } from '../../../services/api'

const AccountsPage = () => {
  const [stats, setStats] = useState(null)

  useEffect(() => {
    const fetchStats = async () => {
      try {
        const [coaRes, custRes, vendRes, billRes, invRes, budRes] = await Promise.all([
          accountsAPI.listCOA(),
          accountsAPI.listCustomers(),
          accountsAPI.listVendors(),
          accountsAPI.listBills(),
          accountsAPI.listInvoices(),
          accountsAPI.listBudgets(),
        ])
        setStats({
          accounts: coaRes.data?.length || 0,
          customers: custRes.data?.length || 0,
          vendors: vendRes.data?.length || 0,
          bills: billRes.data?.length || 0,
          invoices: invRes.data?.length || 0,
          budgets: budRes.data?.length || 0,
        })
      } catch (err) {
        // silently fail for overview
      }
    }
    fetchStats()
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
          <p>Loading accounts status...</p>
        )}
      </div>

      {/* Getting Started */}
      <div className="accounts-summary" style={{ marginTop: '16px' }}>
        <h3>Getting Started</h3>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '12px', marginTop: '8px' }}>
          <div style={{ padding: '12px', borderLeft: '3px solid #3b82f6' }}>
            <strong>Chart of Accounts</strong>
            <p style={{ fontSize: '0.85rem', marginTop: '4px' }}>Create and maintain your account structure.</p>
          </div>
          <div style={{ padding: '12px', borderLeft: '3px solid #10b981' }}>
            <strong>Journal Entries</strong>
            <p style={{ fontSize: '0.85rem', marginTop: '4px' }}>Post double-entry journals to the ledger.</p>
          </div>
          <div style={{ padding: '12px', borderLeft: '3px solid #f59e0b' }}>
            <strong>AR / AP</strong>
            <p style={{ fontSize: '0.85rem', marginTop: '4px' }}>Track customer invoices and vendor bills.</p>
          </div>
          <div style={{ padding: '12px', borderLeft: '3px solid #8b5cf6' }}>
            <strong>Budgets & Reports</strong>
            <p style={{ fontSize: '0.85rem', marginTop: '4px' }}>Configure budgets and review financial reports.</p>
          </div>
        </div>
      </div>
    </div>
  )
}

export default AccountsPage
