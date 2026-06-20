import React, { useEffect, useState, useCallback } from 'react'
import '../../../styles/ModulePage.css'
import { accountsAPI } from '../../../services/api'
import { useAccountsPermissions, isPageAllowed } from '../accountsPermissions'
import Input from '../../../components/ui/Input'
import Button from '../../../components/ui/Button'

const TransactionsPage = () => {
  const { department, canPerformAction, loading } = useAccountsPermissions()
  if (loading) return <div className="module-page"><p>Loading...</p></div>
  if (!isPageAllowed(department, 'transactions')) {
    return (
      <div className="module-page">
        <h2>Access Denied</h2>
        <p>You do not have permission to view Financial Transactions.</p>
      </div>
    )
  }
  const [expenses, setExpenses] = useState([])
  const [income, setIncome] = useState([])
  const [accounts, setAccounts] = useState([])
  const [expenseForm, setExpenseForm] = useState({ description: '', amount: 0, account_id: '', reference: '' })
  const [incomeForm, setIncomeForm] = useState({ description: '', amount: 0, account_id: '', reference: '' })
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')

  const loadAccounts = useCallback(async () => {
    try {
      const response = await accountsAPI.listCOA()
      setAccounts(response.data)
    } catch (err) {
      // silently fail
    }
  }, [])

  useEffect(() => {
    async function loadData() {
      try {
        const [expenseResponse, incomeResponse] = await Promise.all([
          accountsAPI.listExpenses(),
          accountsAPI.listIncome(),
        ])
        setExpenses(expenseResponse.data)
        setIncome(incomeResponse.data)
      } catch (err) {
        setError(err.response?.data?.detail || 'Unable to load transactions')
      }
    }
    loadData()
    loadAccounts()
  }, [loadAccounts])

  const getAccountName = (id) => {
    const acct = accounts.find(a => a.id === Number(id))
    return acct ? `${acct.account_code} - ${acct.account_name}` : `Account #${id}`
  }

  const handleExpenseSubmit = async (e) => {
    e.preventDefault()
    try {
      await accountsAPI.createExpense(expenseForm)
      setSuccess('Expense recorded successfully!')
      setError('')
      setExpenseForm({ description: '', amount: 0, account_id: '', reference: '' })
      const response = await accountsAPI.listExpenses()
      setExpenses(response.data)
    } catch (err) {
      setError(err.response?.data?.detail || 'Unable to record expense')
      setSuccess('')
    }
  }

  const handleIncomeSubmit = async (e) => {
    e.preventDefault()
    try {
      await accountsAPI.createIncome(incomeForm)
      setSuccess('Income recorded successfully!')
      setError('')
      setIncomeForm({ description: '', amount: 0, account_id: '', reference: '' })
      const response = await accountsAPI.listIncome()
      setIncome(response.data)
    } catch (err) {
      setError(err.response?.data?.detail || 'Unable to record income')
      setSuccess('')
    }
  }

  const formatCurrency = (val) =>
    Number(val || 0).toLocaleString('en-IN', { style: 'currency', currency: 'INR', minimumFractionDigits: 2 })

  const StatusBadge = ({ status }) => (
    <span className={`status-badge ${status}`}>{status}</span>
  )

  // Filter accounts by type for better UX
  const expenseAccounts = accounts.filter(a => a.account_type === 'Expense' || a.account_type === 'Asset')
  const incomeAccounts = accounts.filter(a => a.account_type === 'Revenue' || a.account_type === 'Asset')

  return (
    <div className="module-page">
      <h2>Financial Transactions</h2>
      <p>Record expenses and income transactions. Each transaction automatically generates a balanced journal entry.</p>
      {error && <div className="error-message">{error}</div>}
      {success && <div className="success-message">{success}</div>}

      <div className="accounts-summary">
        <h3>Record Expense</h3>
        {canPerformAction('createExpense') ? (
          <form onSubmit={handleExpenseSubmit} className="accounts-form">
            <div className="form-row">
              <Input id="expense-desc" label="Description" value={expenseForm.description} onChange={(e) => setExpenseForm({ ...expenseForm, description: e.target.value })} />
              <Input id="expense-amount" label="Amount" type="number" value={expenseForm.amount} onChange={(e) => setExpenseForm({ ...expenseForm, amount: Number(e.target.value) })} />
            </div>
          <div className="form-row">
            <div>
              <label className="ui-input-label">Expense Account</label>
              <select className="ui-input-field" value={expenseForm.account_id} onChange={(e) => setExpenseForm({ ...expenseForm, account_id: Number(e.target.value) })}>
                <option value="">Select account</option>
                {accounts.map((acct) => (
                  <option key={acct.id} value={acct.id}>{acct.account_code} - {acct.account_name} ({acct.account_type})</option>
                ))}
              </select>
            </div>
            <Input id="expense-reference" label="Reference" value={expenseForm.reference} onChange={(e) => setExpenseForm({ ...expenseForm, reference: e.target.value })} />
          </div>
            <Button type="submit">Record Expense</Button>
          </form>
        ) : (
          <div className="permission-warning" style={{ padding: '14px', border: '1px solid #f59e0b', borderRadius: '8px', background: '#fffbeb' }}>
            You do not have permission to record expenses.
          </div>
        )}
      </div>

      <div className="accounts-summary" style={{ marginTop: '20px' }}>
        <h3>Record Income</h3>
        {canPerformAction('createIncome') ? (
          <form onSubmit={handleIncomeSubmit} className="accounts-form">
            <div className="form-row">
              <Input id="income-desc" label="Description" value={incomeForm.description} onChange={(e) => setIncomeForm({ ...incomeForm, description: e.target.value })} />
              <Input id="income-amount" label="Amount" type="number" value={incomeForm.amount} onChange={(e) => setIncomeForm({ ...incomeForm, amount: Number(e.target.value) })} />
            </div>
            <div className="form-row">
              <div>
                <label className="ui-input-label">Income Account</label>
                <select className="ui-input-field" value={incomeForm.account_id} onChange={(e) => setIncomeForm({ ...incomeForm, account_id: Number(e.target.value) })}>
                  <option value="">Select account</option>
                  {accounts.map((acct) => (
                    <option key={acct.id} value={acct.id}>{acct.account_code} - {acct.account_name} ({acct.account_type})</option>
                  ))}
                </select>
              </div>
              <Input id="income-reference" label="Reference" value={incomeForm.reference} onChange={(e) => setIncomeForm({ ...incomeForm, reference: e.target.value })} />
            </div>
            <Button type="submit">Record Income</Button>
          </form>
        ) : (
          <div className="permission-warning" style={{ padding: '14px', border: '1px solid #f59e0b', borderRadius: '8px', background: '#fffbeb' }}>
            You do not have permission to record income transactions.
          </div>
        )}
      </div>

      <div className="accounts-summary" style={{ marginTop: '20px' }}>
        <h3>Recent Expenses</h3>
        <table className="accounts-table">
          <thead>
            <tr>
              <th>Description</th>
              <th>Account</th>
              <th>Amount</th>
              <th>Reference</th>
              <th>Status</th>
            </tr>
          </thead>
          <tbody>
            {expenses.length === 0 ? (
              <tr><td colSpan="5" className="empty-state">No expenses recorded yet.</td></tr>
            ) : (
              expenses.map((item) => (
                <tr key={item.id}>
                  <td>{item.description}</td>
                  <td>{getAccountName(item.account_id)}</td>
                  <td>{formatCurrency(item.amount)}</td>
                  <td>{item.reference || '—'}</td>
                  <td><StatusBadge status={item.status} /></td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      <div className="accounts-summary" style={{ marginTop: '20px' }}>
        <h3>Recent Income</h3>
        <table className="accounts-table">
          <thead>
            <tr>
              <th>Description</th>
              <th>Account</th>
              <th>Amount</th>
              <th>Reference</th>
              <th>Status</th>
            </tr>
          </thead>
          <tbody>
            {income.length === 0 ? (
              <tr><td colSpan="5" className="empty-state">No income recorded yet.</td></tr>
            ) : (
              income.map((item) => (
                <tr key={item.id}>
                  <td>{item.description}</td>
                  <td>{getAccountName(item.account_id)}</td>
                  <td>{formatCurrency(item.amount)}</td>
                  <td>{item.reference || '—'}</td>
                  <td><StatusBadge status={item.status} /></td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  )
}

export default TransactionsPage
