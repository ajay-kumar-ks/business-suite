import React, { useEffect, useState } from 'react'
import '../../../styles/ModulePage.css'
import '../../../styles/AccountsReports.css'
import '../../../styles/AccountsTheme.css'
import { useAccountsPermissions, isPageAllowed } from '../accountsPermissions'
import { accountsAPI } from '../../../services/api'
import { DollarSign, TrendingUp, TrendingDown, CheckCircle, XCircle, RefreshCw } from 'lucide-react'

const ReportsPage = () => {
  const { department, canPerformAction, loading: permissionsLoading } = useAccountsPermissions()
  if (permissionsLoading) return <div className="module-page"><p>Loading...</p></div>
  if (!isPageAllowed(department, 'reports')) {
    return (
      <div className="module-page">
        <h2>Access Denied</h2>
        <p>You do not have permission to view Reports.</p>
      </div>
    )
  }
  const [reports, setReports] = useState([])
  const [error, setError] = useState('')
  const [reportsLoading, setReportsLoading] = useState(true)
  const [activeTab, setActiveTab] = useState('summary')

  const fetchReports = async () => {
    setReportsLoading(true)
    try {
      const [trialResponse, profitResponse, balanceResponse] = await Promise.all([
        accountsAPI.getTrialBalance(),
        accountsAPI.getProfitLoss(),
        accountsAPI.getBalanceSheet(),
      ])
      setReports([
        { name: 'Trial Balance', ...trialResponse.data },
        { name: 'Profit & Loss', ...profitResponse.data },
        { name: 'Balance Sheet', ...balanceResponse.data },
      ])
      setError('')
    } catch (err) {
      setError(err.response?.data?.detail || 'Unable to load reports')
    } finally {
      setReportsLoading(false)
    }
  }

  useEffect(() => {
    fetchReports()
  }, [])

  const formatCurrency = (val) =>
    Number(val || 0).toLocaleString('en-IN', { style: 'currency', currency: 'INR', minimumFractionDigits: 2 })

  const trialBalance = reports.find(r => r.name === 'Trial Balance') || {}
  const profitLoss = reports.find(r => r.name === 'Profit & Loss') || {}
  const balanceSheet = reports.find(r => r.name === 'Balance Sheet') || {}

  return (
    <div className="module-page">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
        <h2 style={{ margin: 0 }}>Financial Reports</h2>
        <button className="action-btn info" onClick={fetchReports} disabled={reportsLoading || !canPerformAction('viewReports')}>
          <RefreshCw size={14} style={{ marginRight: '6px', verticalAlign: 'middle' }} />
          Refresh
        </button>
      </div>
      <p>View accounting reports generated in real-time from ledger data.</p>
      {error && <div className="error-message">{error}</div>}

      {!canPerformAction('viewReports') ? (
        <div className="permission-warning" style={{ padding: '14px', border: '1px solid #f59e0b', borderRadius: '8px', background: '#fffbeb', marginTop: '16px' }}>
          You do not have permission to view financial reports.
        </div>
      ) : (
        <div>
          {/* Report Tabs */}
          <div className="accounts-navigation" style={{ marginTop: '16px' }}>
            <button className={activeTab === 'summary' ? 'active' : ''} onClick={() => setActiveTab('summary')}>Summary</button>
            <button className={activeTab === 'trial-balance' ? 'active' : ''} onClick={() => setActiveTab('trial-balance')}>Trial Balance</button>
            <button className={activeTab === 'profit-loss' ? 'active' : ''} onClick={() => setActiveTab('profit-loss')}>Profit & Loss</button>
            <button className={activeTab === 'balance-sheet' ? 'active' : ''} onClick={() => setActiveTab('balance-sheet')}>Balance Sheet</button>
          </div>

          {reportsLoading ? (
            <div className="accounts-summary" style={{ marginTop: '16px', textAlign: 'center', padding: '40px' }}>
              <p>Loading reports...</p>
            </div>
          ) : (
            <>
              {/* Summary View */}
              {activeTab === 'summary' && (
                <div className="reports-grid" style={{ marginTop: '16px' }}>
                  <div className="report-card">
                    <div className="report-card-header">
                      <div className="report-icon" style={{ background: '#dbeafe', color: '#1d4ed8' }}>
                        <DollarSign size={20} />
                      </div>
                      <h3>Trial Balance</h3>
                    </div>
                    <div className="report-card-body">
                      <div className="report-row">
                        <span>Total Debit</span>
                        <span className="report-value">{formatCurrency(trialBalance.total_debit)}</span>
                      </div>
                      <div className="report-row">
                        <span>Total Credit</span>
                        <span className="report-value">{formatCurrency(trialBalance.total_credit)}</span>
                      </div>
                      <div className="report-status-row">
                        {trialBalance.is_balanced ? (
                          <span style={{ color: '#10b981', display: 'flex', alignItems: 'center', gap: '6px' }}>
                            <CheckCircle size={16} /> Balanced
                          </span>
                        ) : (
                          <span style={{ color: '#ef4444', display: 'flex', alignItems: 'center', gap: '6px' }}>
                            <XCircle size={16} /> Unbalanced
                          </span>
                        )}
                        <span className="account-count">{trialBalance.accounts?.length || 0} accounts</span>
                      </div>
                    </div>
                  </div>
                  <div className="report-card">
                    <div className="report-card-header">
                      <div className="report-icon" style={{ background: '#dcfce7', color: '#059669' }}>
                        <TrendingUp size={20} />
                      </div>
                      <h3>Profit & Loss</h3>
                    </div>
                    <div className="report-card-body">
                      <div className="report-row">
                        <span>Revenue</span>
                        <span className="report-value positive">{formatCurrency(profitLoss.revenue)}</span>
                      </div>
                      <div className="report-row">
                        <span>Expenses</span>
                        <span className="report-value negative">{formatCurrency(profitLoss.expenses)}</span>
                      </div>
                      <div className="report-divider" />
                      <div className="report-row">
                        <span style={{ fontWeight: 700 }}>Net Profit</span>
                        <span className={`report-value ${Number(profitLoss.net_profit) >= 0 ? 'positive' : 'negative'}`} style={{ fontWeight: 700 }}>
                          {formatCurrency(profitLoss.net_profit)}
                        </span>
                      </div>
                    </div>
                  </div>
                  <div className="report-card">
                    <div className="report-card-header">
                      <div className="report-icon" style={{ background: '#f3e8ff', color: '#7c3aed' }}>
                        <TrendingDown size={20} />
                      </div>
                      <h3>Balance Sheet</h3>
                    </div>
                    <div className="report-card-body">
                      <div className="report-row">
                        <span>Assets</span>
                        <span className="report-value">{formatCurrency(balanceSheet.assets)}</span>
                      </div>
                      <div className="report-row">
                        <span>Liabilities</span>
                        <span className="report-value">{formatCurrency(balanceSheet.liabilities)}</span>
                      </div>
                      <div className="report-row">
                        <span>Equity</span>
                        <span className="report-value">{formatCurrency(balanceSheet.equity)}</span>
                      </div>
                      <div className="report-divider" />
                      <div className="report-status-row">
                        {balanceSheet.is_balanced ? (
                          <span style={{ color: '#10b981', display: 'flex', alignItems: 'center', gap: '6px' }}>
                            <CheckCircle size={16} /> Assets = Liabilities + Equity
                          </span>
                        ) : (
                          <span style={{ color: '#ef4444', display: 'flex', alignItems: 'center', gap: '6px' }}>
                            <XCircle size={16} /> Equation out of balance
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* Trial Balance Detail */}
              {activeTab === 'trial-balance' && (
                <div className="accounts-summary" style={{ marginTop: '16px' }}>
                  <h3>Trial Balance Detail</h3>
                  <table className="accounts-table">
                    <thead>
                      <tr>
                        <th>Account Code</th>
                        <th>Account Name</th>
                        <th>Type</th>
                        <th>Debit</th>
                        <th>Credit</th>
                      </tr>
                    </thead>
                    <tbody>
                      {(!trialBalance.accounts || trialBalance.accounts.length === 0) ? (
                        <tr><td colSpan="5" className="empty-state">No ledger entries found. Post some journals first.</td></tr>
                      ) : (
                        trialBalance.accounts.map((acct, idx) => (
                          <tr key={idx}>
                            <td><strong>{acct.account_code}</strong></td>
                            <td>{acct.account_name}</td>
                            <td><span className="status-badge draft">{acct.account_type}</span></td>
                            <td>{acct.debit > 0 ? formatCurrency(acct.debit) : '—'}</td>
                            <td>{acct.credit > 0 ? formatCurrency(acct.credit) : '—'}</td>
                          </tr>
                        ))
                      )}
                    </tbody>
                    <tfoot>
                      <tr style={{ fontWeight: 700, background: 'rgba(0,0,0,0.03)' }}>
                        <td colSpan="3"><strong>Total</strong></td>
                        <td>{formatCurrency(trialBalance.total_debit)}</td>
                        <td>{formatCurrency(trialBalance.total_credit)}</td>
                      </tr>
                    </tfoot>
                  </table>
                </div>
              )}

              {/* P&L Detail */}
              {activeTab === 'profit-loss' && (
                <div className="accounts-summary" style={{ marginTop: '16px' }}>
                  <h3>Profit & Loss Statement</h3>
                  <div className="report-statement">
                    <div className="statement-section">
                      <h4>Revenue</h4>
                      <div className="statement-row">
                        <span>Total Revenue</span>
                        <span className="positive">{formatCurrency(profitLoss.revenue)}</span>
                      </div>
                    </div>
                    <div className="statement-section">
                      <h4>Expenses</h4>
                      <div className="statement-row">
                        <span>Total Expenses</span>
                        <span className="negative">{formatCurrency(profitLoss.expenses)}</span>
                      </div>
                    </div>
                    <div className="statement-divider" />
                    <div className="statement-row total">
                      <span>Net Profit</span>
                      <span className={Number(profitLoss.net_profit) >= 0 ? 'positive' : 'negative'}>
                        {formatCurrency(profitLoss.net_profit)}
                      </span>
                    </div>
                  </div>
                </div>
              )}

              {/* Balance Sheet Detail */}
              {activeTab === 'balance-sheet' && (
                <div className="accounts-summary" style={{ marginTop: '16px' }}>
                  <h3>Balance Sheet</h3>
                  <div className="report-statement">
                    <div className="statement-section">
                      <h4>Assets</h4>
                      <div className="statement-row">
                        <span>Total Assets</span>
                        <span>{formatCurrency(balanceSheet.assets)}</span>
                      </div>
                    </div>
                    <div className="statement-section">
                      <h4>Liabilities</h4>
                      <div className="statement-row">
                        <span>Total Liabilities</span>
                        <span>{formatCurrency(balanceSheet.liabilities)}</span>
                      </div>
                    </div>
                    <div className="statement-section">
                      <h4>Equity</h4>
                      <div className="statement-row">
                        <span>Total Equity</span>
                        <span>{formatCurrency(balanceSheet.equity)}</span>
                      </div>
                    </div>
                    <div className="statement-divider" />
                    <div className="statement-row total">
                      <span>Total Liabilities + Equity</span>
                      <span>{formatCurrency(Number(balanceSheet.liabilities) + Number(balanceSheet.equity))}</span>
                    </div>
                    <div className="statement-verify">
                      {balanceSheet.is_balanced ? (
                        <span style={{ color: '#10b981' }}>✓ Assets = Liabilities + Equity (Balanced)</span>
                      ) : (
                        <span style={{ color: '#ef4444' }}>✗ Assets ≠ Liabilities + Equity (Unbalanced)</span>
                      )}
                    </div>
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      )}
    </div>
  )
}

export default ReportsPage
