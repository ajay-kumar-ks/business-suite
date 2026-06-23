import React, { useEffect, useState, useCallback } from 'react'
import '../../../styles/ModulePage.css'
import { accountsAPI, getAPIErrorMessage } from '../../../services/api'
import { useAccountsPermissions, isPageAllowed } from '../accountsPermissions'
import Input from '../../../components/ui/Input'
import Button from '../../../components/ui/Button'
import { ChevronDown, ChevronUp } from 'lucide-react'

const BudgetsPage = () => {
  const { department, canPerformAction, loading } = useAccountsPermissions()
  if (loading) return <div className="module-page"><p>Loading...</p></div>
  if (!isPageAllowed(department, 'budgets')) {
    return (
      <div className="module-page">
        <h2>Access Denied</h2>
        <p>You do not have permission to view Budgets.</p>
      </div>
    )
  }
  const [budgets, setBudgets] = useState([])
  const [accounts, setAccounts] = useState([])
  const [form, setForm] = useState({ name: '', fiscal_year: new Date().getFullYear(), total_amount: 0, start_date: '', end_date: '', status: 'draft' })
  const [message, setMessage] = useState('')
  const [messageType, setMessageType] = useState('success')
  const [expandedId, setExpandedId] = useState(null)
  const [budgetLines, setBudgetLines] = useState({})
  const [lineForm, setLineForm] = useState({ account_id: '', allocated_amount: 0 })
  const [loadingLines, setLoadingLines] = useState({})

  const showMessage = (msg, type = 'success') => {
    setMessage(msg)
    setMessageType(type)
    setTimeout(() => setMessage(''), 4000)
  }

  const loadBudgets = useCallback(async () => {
    try {
      const response = await accountsAPI.listBudgets()
      setBudgets(response.data)
    } catch (err) {
      showMessage(getAPIErrorMessage(err, 'Unable to load budgets'), 'error')
    }
  }, [])

  const loadAccounts = useCallback(async () => {
    try {
      const response = await accountsAPI.listCOA()
      setAccounts(response.data)
    } catch (err) {
      // silently fail
    }
  }, [])

  useEffect(() => {
    loadBudgets()
    loadAccounts()
  }, [loadBudgets, loadAccounts])

  const handleSubmit = async (e) => {
    e.preventDefault()
    try {
      await accountsAPI.createBudget(form)
      showMessage('Budget created successfully!')
      setForm({ name: '', fiscal_year: new Date().getFullYear(), total_amount: 0, start_date: '', end_date: '', status: 'draft' })
      loadBudgets()
    } catch (err) {
      showMessage(getAPIErrorMessage(err, 'Unable to create budget'), 'error')
    }
  }

  const toggleExpand = async (budgetId) => {
    if (expandedId === budgetId) {
      setExpandedId(null)
      return
    }
    setExpandedId(budgetId)
    if (!budgetLines[budgetId]) {
      try {
        const response = await accountsAPI.listBudgetLines(budgetId)
        setBudgetLines(prev => ({ ...prev, [budgetId]: response.data }))
      } catch (err) {
        setBudgetLines(prev => ({ ...prev, [budgetId]: [] }))
      }
    }
  }

  const handleAddLine = async (budgetId) => {
    if (!lineForm.account_id || !lineForm.allocated_amount) return
    setLoadingLines(prev => ({ ...prev, [budgetId]: true }))
    try {
      await accountsAPI.createBudgetLine(budgetId, lineForm)
      showMessage('Budget line added!')
      setLineForm({ account_id: '', allocated_amount: 0 })
      const response = await accountsAPI.listBudgetLines(budgetId)
      setBudgetLines(prev => ({ ...prev, [budgetId]: response.data }))
    } catch (err) {
      showMessage(getAPIErrorMessage(err, 'Unable to add budget line'), 'error')
    } finally {
      setLoadingLines(prev => ({ ...prev, [budgetId]: false }))
    }
  }

  const getAccountName = (id) => {
    const acct = accounts.find(a => a.id === Number(id))
    return acct ? `${acct.account_code} - ${acct.account_name}` : `Account #${id}`
  }

  const StatusBadge = ({ status }) => (
    <span className={`status-badge ${status}`}>{status}</span>
  )

  const formatCurrency = (val) =>
    Number(val || 0).toLocaleString('en-IN', { style: 'currency', currency: 'INR', minimumFractionDigits: 2 })

  return (
    <div className="module-page">
      <h2>Budgets</h2>
      <p>Define budgets by fiscal year and review budget allocations with consumption tracking.</p>
      {message && <div className={messageType === 'error' ? 'error-message' : 'success-message'}>{message}</div>}

      <div className="accounts-summary">
        <h3>Create Budget</h3>
        {canPerformAction('createBudget') ? (
          <details>
            <summary style={{ cursor: 'pointer', marginBottom: '10px', fontWeight: 600, color: 'var(--primary)' }}>+ New Budget</summary>
            <form onSubmit={handleSubmit} className="accounts-form">
            <div className="form-row">
              <Input id="budget-name" label="Name" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
              <Input id="budget-year" label="Fiscal Year" type="number" value={form.fiscal_year} onChange={(e) => setForm({ ...form, fiscal_year: Number(e.target.value) })} />
            </div>
            <div className="form-row">
              <Input id="budget-amount" label="Total Amount" type="number" value={form.total_amount} onChange={(e) => setForm({ ...form, total_amount: Number(e.target.value) })} />
              <Input id="budget-start" label="Start Date" type="date" value={form.start_date} onChange={(e) => setForm({ ...form, start_date: e.target.value })} />
            </div>
            <div className="form-row">
              <Input id="budget-end" label="End Date" type="date" value={form.end_date} onChange={(e) => setForm({ ...form, end_date: e.target.value })} />
              <div>
                <label className="ui-input-label">Status</label>
                <select className="ui-input-field" value={form.status} onChange={(e) => setForm({ ...form, status: e.target.value })}>
                  <option value="draft">Draft</option>
                  <option value="active">Active</option>
                  <option value="completed">Completed</option>
                </select>
              </div>
            </div>
            <Button type="submit">Create Budget</Button>
          </form>
          </details>
        ) : (
          <div className="permission-warning" style={{ padding: '14px', border: '1px solid #f59e0b', borderRadius: '8px', background: '#fffbeb' }}>
            You do not have permission to create budgets.
          </div>
        )}
      </div>

      <div className="accounts-summary" style={{ marginTop: '20px' }}>
        <h3>Existing Budgets</h3>
        <table className="accounts-table">
          <thead>
            <tr>
              <th style={{ width: '30px' }}></th>
              <th>Name</th>
              <th>Fiscal Year</th>
              <th>Total Amount</th>
              <th>Spent</th>
              <th>Consumption</th>
              <th>Status</th>
            </tr>
          </thead>
          <tbody>
            {budgets.length === 0 ? (
              <tr><td colSpan="7" className="empty-state">No budgets created yet.</td></tr>
            ) : (
              budgets.map((budget) => {
                const lines = budgetLines[budget.id] || []
                const totalSpent = lines.reduce((s, l) => s + Number(l.spent_amount || 0), 0)
                const consumptionPct = budget.total_amount > 0 ? Math.min(100, (totalSpent / Number(budget.total_amount)) * 100) : 0
                const barClass = consumptionPct > 100 ? 'danger' : consumptionPct > 75 ? 'warning' : 'safe'
                return (
                  <React.Fragment key={budget.id}>
                    <tr className="clickable-row" onClick={() => toggleExpand(budget.id)}>
                      <td>{expandedId === budget.id ? <ChevronUp size={16} /> : <ChevronDown size={16} />}</td>
                      <td><strong>{budget.name}</strong></td>
                      <td>{budget.fiscal_year}</td>
                      <td>{formatCurrency(budget.total_amount)}</td>
                      <td>{formatCurrency(totalSpent)}</td>
                      <td>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                          <div className="budget-progress" style={{ flex: 1, maxWidth: '120px' }}>
                            <div className={`budget-progress-bar ${barClass}`} style={{ width: `${Math.min(consumptionPct, 100)}%` }} />
                          </div>
                          <span style={{ fontSize: '0.82rem', fontWeight: 600 }}>{consumptionPct.toFixed(1)}%</span>
                        </div>
                      </td>
                      <td><StatusBadge status={budget.status} /></td>
                    </tr>
                    {expandedId === budget.id && (
                      <tr className="detail-row">
                        <td colSpan="7">
                          <div style={{ fontWeight: 600, marginBottom: '10px', color: 'var(--text)' }}>Budget Lines (Account Allocations)</div>
                          <div style={{ display: 'flex', gap: '10px', marginBottom: '12px', flexWrap: 'wrap', alignItems: 'end' }}>
                            <div style={{ minWidth: '200px' }}>
                              <label className="ui-input-label">Account</label>
                              <select className="ui-input-field" value={lineForm.account_id} onChange={(e) => setLineForm({ ...lineForm, account_id: e.target.value === '' ? '' : Number(e.target.value) })}>
                                <option value="">Select account</option>
                                {accounts.map((acct) => (
                                  <option key={acct.id} value={acct.id}>{acct.account_code} - {acct.account_name}</option>
                                ))}
                              </select>
                            </div>
                            <div style={{ minWidth: '150px' }}>
                              <Input id="alloc-amount" label="Allocated Amount" type="number" value={lineForm.allocated_amount} onChange={(e) => setLineForm({ ...lineForm, allocated_amount: Number(e.target.value) })} />
                            </div>
                            {canPerformAction('manageBudgetLines') ? (
                              <Button onClick={() => handleAddLine(budget.id)} disabled={loadingLines[budget.id]}>
                                {loadingLines[budget.id] ? 'Adding...' : 'Add Line'}
                              </Button>
                            ) : (
                              <div style={{ padding: '8px 12px', border: '1px solid #f59e0b', borderRadius: '8px', background: '#fffbeb', marginTop: '8px', width: '100%' }}>
                                You do not have permission to add or edit budget lines.
                              </div>
                            )}
                          </div>
                          <table className="journal-lines-table">
                            <thead>
                              <tr>
                                <th>Account</th>
                                <th>Allocated</th>
                                <th>Spent</th>
                                <th>Consumed</th>
                              </tr>
                            </thead>
                            <tbody>
                              {lines.length === 0 ? (
                                <tr><td colSpan="4" style={{ textAlign: 'center', color: 'var(--text)', opacity: 0.6, padding: '16px' }}>No budget lines yet. Add an account allocation above.</td></tr>
                              ) : (
                                lines.map((line) => (
                                  <tr key={line.id}>
                                    <td>{getAccountName(line.account_id)}</td>
                                    <td>{formatCurrency(line.allocated_amount)}</td>
                                    <td>{formatCurrency(line.spent_amount)}</td>
                                    <td>
                                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                        <div className="budget-progress" style={{ flex: 1, maxWidth: '100px' }}>
                                          <div className={`budget-progress-bar ${Number(line.consumed_percentage) > 75 ? 'warning' : 'safe'}`} style={{ width: `${Math.min(Number(line.consumed_percentage), 100)}%` }} />
                                        </div>
                                        <span style={{ fontSize: '0.82rem' }}>{Number(line.consumed_percentage).toFixed(1)}%</span>
                                      </div>
                                    </td>
                                  </tr>
                                ))
                              )}
                            </tbody>
                          </table>
                        </td>
                      </tr>
                    )}
                  </React.Fragment>
                )
              })
            )}
          </tbody>
        </table>
      </div>
    </div>
  )
}

export default BudgetsPage
