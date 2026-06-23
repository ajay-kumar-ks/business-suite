import React, { useEffect, useState } from 'react'
import { accountsAPI, getAPIErrorMessage } from '../../../services/api'
import { DollarSign, TrendingUp, TrendingDown, PieChart } from 'lucide-react'
import '../styles/AccountsPage.css'

const SummaryCard = ({ icon: Icon, label, value, sub, color, positive }) => (
  <div className="fin-summary-card">
    <div className="fin-summary-icon" style={{ background: color + '20', color }}>
      <Icon size={24} />
    </div>
    <div className="fin-summary-info">
      <span className="fin-summary-label">{label}</span>
      <span className={`fin-summary-value ${positive === false ? 'negative' : positive ? 'positive' : ''}`}>
        {value}
      </span>
      {sub && <span className="fin-summary-sub">{sub}</span>}
    </div>
  </div>
)

const FinanceSummary = () => {
  const [finData, setFinData] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [plRes, bsRes, tbRes] = await Promise.all([
          accountsAPI.getProfitLoss(),
          accountsAPI.getBalanceSheet(),
          accountsAPI.getTrialBalance(),
        ])
        setFinData({
          profitLoss: plRes.data,
          balanceSheet: bsRes.data,
          trialBalance: tbRes.data,
        })
      } catch (err) {
        setError(getAPIErrorMessage(err, 'Unable to load financial summary'))
      } finally {
        setLoading(false)
      }
    }
    fetchData()
  }, [])

  const formatCurrency = (val) => {
    const num = Number(val || 0)
    return new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', minimumFractionDigits: 2 }).format(num)
  }

  if (loading) return <div className="accounts-summary"><h3>Finance Summary</h3><p>Loading financial data...</p></div>
  if (error) return <div className="accounts-summary"><h3>Finance Summary</h3><div className="error-message">{error}</div></div>

  const pl = finData?.profitLoss || {}
  const bs = finData?.balanceSheet || {}
  const tb = finData?.trialBalance || {}

  return (
    <div className="fin-summary-grid">
      <SummaryCard
        icon={TrendingUp}
        label="Revenue"
        value={formatCurrency(pl.revenue)}
        color="#10b981"
        positive
      />
      <SummaryCard
        icon={TrendingDown}
        label="Expenses"
        value={formatCurrency(pl.expenses)}
        color="#ef4444"
        positive={false}
      />
      <SummaryCard
        icon={DollarSign}
        label="Net Profit"
        value={formatCurrency(pl.net_profit)}
        sub={pl.net_profit >= 0 ? 'Profitable' : 'Loss'}
        color={pl.net_profit >= 0 ? '#3b82f6' : '#f59e0b'}
        positive={pl.net_profit >= 0}
      />
      <SummaryCard
        icon={PieChart}
        label="Assets"
        value={formatCurrency(bs.assets)}
        sub={`Liabilities: ${formatCurrency(bs.liabilities)}`}
        color="#8b5cf6"
      />
      {tb.is_balanced !== undefined && (
        <div className="fin-summary-balanced">
          <span className={tb.is_balanced ? 'balanced-yes' : 'balanced-no'}>
            {tb.is_balanced ? '✓ Books Balanced' : '✗ Books Unbalanced'}
          </span>
        </div>
      )}
    </div>
  )
}

export default FinanceSummary
