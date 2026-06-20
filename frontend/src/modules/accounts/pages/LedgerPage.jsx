import React, { useEffect, useState, useCallback } from 'react'
import '../../../styles/ModulePage.css'
import { accountsAPI } from '../../../services/api'
import { useAccountsPermissions, isPageAllowed } from '../accountsPermissions'
import { BookOpen, RefreshCw } from 'lucide-react'

const LedgerPage = () => {
  const { department, loading: permissionsLoading } = useAccountsPermissions()
  if (permissionsLoading) return <div className="module-page"><p>Loading...</p></div>
  if (!isPageAllowed(department, 'ledger')) {
    return (
      <div className="module-page">
        <h2>Access Denied</h2>
        <p>You do not have permission to view the General Ledger.</p>
      </div>
    )
  }

  const [ledger, setLedger] = useState([])
  const [accounts, setAccounts] = useState([])
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(true)
  const [filterType, setFilterType] = useState('all')

  const loadAccounts = useCallback(async () => {
    try {
      const response = await accountsAPI.listCOA()
      setAccounts(response.data)
    } catch (err) {
      // silently fail
    }
  }, [])

  const fetchLedger = useCallback(async () => {
    setLoading(true)
    try {
      const response = await accountsAPI.listLedger()
      setLedger(response.data)
      setError('')
    } catch (err) {
      setError(err.response?.data?.detail || 'Failed to load ledger entries')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchLedger()
    loadAccounts()
  }, [fetchLedger, loadAccounts])

  const getAccountInfo = (id) => {
    const acct = accounts.find(a => a.id === Number(id))
    return acct ? { name: `${acct.account_code} - ${acct.account_name}`, type: acct.account_type } : { name: `Account #${id}`, type: 'Unknown' }
  }

  const formatCurrency = (val) =>
    Number(val || 0).toLocaleString('en-IN', { style: 'currency', currency: 'INR', minimumFractionDigits: 2 })

  // Summary calculations
  const totalDebit = ledger.reduce((s, e) => s + Number(e.debit), 0)
  const totalCredit = ledger.reduce((s, e) => s + Number(e.credit), 0)

  // Filter unique account types for dropdown
  const accountTypes = [...new Set(accounts.map(a => a.account_type))]

  const filteredLedger = filterType === 'all'
    ? ledger
    : ledger.filter(e => {
        const info = getAccountInfo(e.account_id)
        return info.type === filterType
      })

  return (
    <div className="module-page">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
        <h2 style={{ margin: 0 }}>General Ledger</h2>
        <button className="action-btn info" onClick={fetchLedger} disabled={loading}>
          <RefreshCw size={14} style={{ marginRight: '6px', verticalAlign: 'middle' }} />
          Refresh
        </button>
      </div>
      <p>Review ledger entries created from posted journals. Ledger entries are immutable — corrections require reversal entries.</p>
      {error && <div className="error-message">{error}</div>}

      {/* Summary Cards */}
      <div className="fin-summary-grid" style={{ marginBottom: '16px' }}>
        <div className="fin-summary-card">
          <div className="fin-summary-icon" style={{ background: '#dbeafe20', color: '#3b82f6' }}>
            <BookOpen size={24} />
          </div>
          <div className="fin-summary-info">
            <span className="fin-summary-label">Total Entries</span>
            <span className="fin-summary-value" style={{ fontSize: '1.2rem' }}>{filteredLedger.length}</span>
          </div>
        </div>
        <div className="fin-summary-card">
          <div className="fin-summary-icon" style={{ background: '#10b98120', color: '#10b981' }}>
            <span style={{ fontSize: '1.2rem', fontWeight: 700 }}>Dr</span>
          </div>
          <div className="fin-summary-info">
            <span className="fin-summary-label">Total Debits</span>
            <span className="fin-summary-value positive" style={{ fontSize: '1.2rem' }}>{formatCurrency(totalDebit)}</span>
          </div>
        </div>
        <div className="fin-summary-card">
          <div className="fin-summary-icon" style={{ background: '#f59e0b20', color: '#f59e0b' }}>
            <span style={{ fontSize: '1.2rem', fontWeight: 700 }}>Cr</span>
          </div>
          <div className="fin-summary-info">
            <span className="fin-summary-label">Total Credits</span>
            <span className="fin-summary-value" style={{ fontSize: '1.2rem', color: '#f59e0b' }}>{formatCurrency(totalCredit)}</span>
          </div>
        </div>
      </div>

      <div className="accounts-summary">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
          <h3 style={{ margin: 0 }}>Ledger Entries</h3>
          <div>
            <label className="ui-input-label" style={{ display: 'inline', marginRight: '8px', fontSize: '0.82rem' }}>Filter by Type:</label>
            <select
              className="ui-input-field"
              style={{ width: 'auto', display: 'inline-block', padding: '6px 12px' }}
              value={filterType}
              onChange={(e) => setFilterType(e.target.value)}
            >
              <option value="all">All Accounts</option>
              {accountTypes.map(type => (
                <option key={type} value={type}>{type}</option>
              ))}
            </select>
          </div>
        </div>
        <table className="accounts-table">
          <thead>
            <tr>
              <th>Account</th>
              <th>Type</th>
              <th>Debit</th>
              <th>Credit</th>
              <th>Posting Date</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan="5" className="empty-state">Loading ledger entries...</td></tr>
            ) : filteredLedger.length === 0 ? (
              <tr><td colSpan="5" className="empty-state">No ledger entries found. Post some journals first.</td></tr>
            ) : (
              filteredLedger.map((entry) => {
                const info = getAccountInfo(entry.account_id)
                return (
                  <tr key={entry.id}>
                    <td><strong>{info.name}</strong></td>
                    <td><span className="status-badge draft">{info.type}</span></td>
                    <td>{entry.debit > 0 ? formatCurrency(entry.debit) : '—'}</td>
                    <td>{entry.credit > 0 ? formatCurrency(entry.credit) : '—'}</td>
                    <td>{new Date(entry.posting_date).toLocaleDateString()}</td>
                  </tr>
                )
              })
            )}
          </tbody>
          {!loading && filteredLedger.length > 0 && (
            <tfoot>
              <tr style={{ fontWeight: 700, background: 'rgba(0,0,0,0.03)' }}>
                <td colSpan="2"><strong>Total</strong></td>
                <td>{formatCurrency(totalDebit)}</td>
                <td>{formatCurrency(totalCredit)}</td>
                <td></td>
              </tr>
            </tfoot>
          )}
        </table>
      </div>
    </div>
  )
}

export default LedgerPage
