import React, { useEffect, useState } from 'react'
import '../../../styles/ModulePage.css'
import '../styles/AccountsPage.css'
import { accountsAPI } from '../../../services/api'
import FinanceSummary from '../components/FinanceSummary'
import { DollarSign, TrendingUp, TrendingDown, BookOpen, Users, FileText, PieChart } from 'lucide-react'

const QuickStatCard = ({ icon: Icon, label, value, color }) => (
  <div className="fin-summary-card" style={{ cursor: 'default' }}>
    <div className="fin-summary-icon" style={{ background: `${color}20`, color }}>
      <Icon size={22} />
    </div>
    <div className="fin-summary-info">
      <span className="fin-summary-label">{label}</span>
      <span className="fin-summary-value" style={{ fontSize: '1.1rem' }}>{value}</span>
    </div>
  </div>
)

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
      <p>Financial dashboard — monitor revenue, expenses, budgets, and account activity at a glance.</p>

      {/* Finance Summary from P&L, Balance Sheet */}
      <FinanceSummary />

      {/* Quick Stats */}
      <div className="fin-summary-grid" style={{ marginTop: '8px' }}>
        <QuickStatCard icon={BookOpen} label="Chart of Accounts" value={stats?.accounts || '...'} color="#3b82f6" />
        <QuickStatCard icon={Users} label="Customers" value={stats?.customers || '...'} color="#10b981" />
        <QuickStatCard icon={FileText} label="Invoices" value={stats?.invoices || '...'} color="#f59e0b" />
        <QuickStatCard icon={TrendingDown} label="Vendors" value={stats?.vendors || '...'} color="#8b5cf6" />
        <QuickStatCard icon={TrendingUp} label="Bills" value={stats?.bills || '...'} color="#ef4444" />
        <QuickStatCard icon={PieChart} label="Budgets" value={stats?.budgets || '...'} color="#06b6d4" />
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
