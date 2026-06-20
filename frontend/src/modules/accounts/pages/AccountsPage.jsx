import React, { useEffect, useState } from 'react'
import '../../../styles/ModulePage.css'
import '../styles/AccountsPage.css'
import { accountsAPI } from '../../../services/api'
import { useAccountsPermissions, isPageAllowed } from '../accountsPermissions'

const AccountsPage = () => {
  const { department, loading } = useAccountsPermissions()
  if (loading) return <div className="module-page"><p>Loading...</p></div>
  if (!isPageAllowed(department, 'overview')) {
    return (
      <div className="module-page">
        <h2>Access Denied</h2>
        <p>You do not have permission to view this page.</p>
      </div>
    )
  }

  const [status, setStatus] = useState(null)
  const [stats, setStats] = useState(null)
  const [error, setError] = useState('')

  useEffect(() => {
    const fetchOverview = async () => {
      try {
        const statusRes = await accountsAPI.getStatus()
        setStatus(statusRes.data)

        if (department === 'admin' || department === 'finance') {
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
        } else if (department === 'hr') {
          const [expRes, budRes] = await Promise.all([
            accountsAPI.listExpenses(),
            accountsAPI.listBudgets(),
          ])
          setStats({
            budgets: budRes.data?.length || 0,
            expenses: expRes.data?.length || 0,
          })
        } else if (department === 'marketing' || department === 'operations' || department === 'it') {
          const [expRes, budRes] = await Promise.all([
            accountsAPI.listExpenses(),
            accountsAPI.listBudgets(),
          ])
          setStats({
            budgets: budRes.data?.length || 0,
            expenses: expRes.data?.length || 0,
          })
        } else if (department === 'sales') {
          const [invRes] = await Promise.all([
            accountsAPI.listInvoices(),
          ])
          const invoices = invRes.data || []
          const outstanding = invoices.reduce((sum, invoice) => sum + Math.max(0, Number(invoice.amount || 0) - Number(invoice.paid_amount || 0)), 0)
          setStats({
            invoices: invoices.length,
            outstandingReceivables: outstanding,
          })
        } else {
          const expRes = await accountsAPI.listExpenses()
          setStats({
            expenses: expRes.data?.length || 0,
          })
        }
      } catch (err) {
        setError(err.response?.data?.detail || 'Failed to load account overview')
      }
    }

    fetchOverview()
  }, [department])

  const summaryItems = () => {
    if (department === 'admin' || department === 'finance') {
      return [
        { label: 'Accounts', value: stats?.accounts },
        { label: 'Customers', value: stats?.customers },
        { label: 'Vendors', value: stats?.vendors },
        { label: 'Bills', value: stats?.bills },
        { label: 'Invoices', value: stats?.invoices },
        { label: 'Budgets', value: stats?.budgets },
      ]
    }

    if (department === 'hr') {
      return [
        { label: 'Budgets', value: stats?.budgets },
        { label: 'Payroll Expense', value: stats?.expenses },
      ]
    }

    if (department === 'marketing') {
      return [
        { label: 'Marketing Spend', value: stats?.expenses },
        { label: 'Marketing Budgets', value: stats?.budgets },
      ]
    }

    if (department === 'operations') {
      return [
        { label: 'Operations Spend', value: stats?.expenses },
        { label: 'Operations Budgets', value: stats?.budgets },
      ]
    }

    if (department === 'it') {
      return [
        { label: 'IT Expenses', value: stats?.expenses },
        { label: 'IT Budgets', value: stats?.budgets },
      ]
    }

    if (department === 'sales') {
      return [
        { label: 'Outstanding Invoices', value: stats?.invoices },
        { label: 'Collections', value: stats?.outstandingReceivables ? `₹${Number(stats.outstandingReceivables).toLocaleString('en-IN')}` : '₹0' },
      ]
    }

    return [
      { label: 'Expense Claims', value: stats?.expenses },
    ]
  }

  return (
    <div className="module-page">
      <h2>Accounts Overview</h2>
      <p>Quick summary of the Accounts module for your department.</p>
      <div className="accounts-summary">
        <h3>Module Status</h3>
        {error && <div className="error-message">{error}</div>}
        {status ? (
          <div>
            <p><strong>Status:</strong> {status.status || 'Unknown'}</p>
            {status.tenant_name && <p><strong>Tenant:</strong> {status.tenant_name}</p>}
            <p><strong>Tenant ID:</strong> {status.tenant_id}</p>
            {(department === 'admin' || department === 'finance') ? (
              <>
                <p><strong>Accounts:</strong> {status.total_accounts}</p>
                <p><strong>Journals:</strong> {status.total_journals}</p>
                <p><strong>Ledger Entries:</strong> {status.total_ledger_entries}</p>
              </>
            ) : (
              <p><strong>Available summary:</strong> limited by your department.</p>
            )}
          </div>
        ) : (
          <p>Loading accounts status...</p>
        )}
      </div>

      <div className="accounts-summary" style={{ marginTop: '16px' }}>
        <h3>Department Summary</h3>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '12px', marginTop: '8px' }}>
          {summaryItems().map((item) => (
            <div key={item.label} style={{ padding: '12px', borderLeft: '3px solid #3b82f6' }}>
              <strong>{item.label}</strong>
              <p style={{ fontSize: '0.85rem', marginTop: '4px' }}>{item.value ?? '0'}</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

export default AccountsPage
