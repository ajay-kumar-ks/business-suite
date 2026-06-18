import React, { useEffect, useState } from 'react'
import '../../../styles/ModulePage.css'
import { accountsAPI } from '../../../services/api'
import Input from '../../../components/ui/Input'
import Button from '../../../components/ui/Button'

const TransactionsPage = () => {
  const [expenses, setExpenses] = useState([])
  const [income, setIncome] = useState([])
  const [expenseForm, setExpenseForm] = useState({ description: '', amount: 0, account_id: 1, reference: '' })
  const [incomeForm, setIncomeForm] = useState({ description: '', amount: 0, account_id: 6, reference: '' })
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')

  useEffect(() => {
    async function loadData() {
      try {
        const [expenseResponse, incomeResponse] = await Promise.all([accountsAPI.listExpenses(), accountsAPI.listIncome()])
        setExpenses(expenseResponse.data)
        setIncome(incomeResponse.data)
      } catch (err) {
        setError(err.response?.data?.detail || 'Unable to load transactions')
      }
    }
    loadData()
  }, [])

  const handleExpenseSubmit = async (e) => {
    e.preventDefault()
    try {
      await accountsAPI.createExpense(expenseForm)
      setSuccess('Expense recorded successfully!')
      setError('')
      setExpenseForm({ description: '', amount: 0, account_id: 1, reference: '' })
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
      setIncomeForm({ description: '', amount: 0, account_id: 6, reference: '' })
      const response = await accountsAPI.listIncome()
      setIncome(response.data)
    } catch (err) {
      setError(err.response?.data?.detail || 'Unable to record income')
      setSuccess('')
    }
  }

  return (
    <div className="module-page">
      <h2>Transactions</h2>
      <p>Record expenses and income transactions that flow through the accounting engine.</p>
      {error && <div className="error-message">{error}</div>}
      {success && <div className="success-message">{success}</div>}

      <div className="accounts-summary">
        <h3>Record Expense</h3>
        <form onSubmit={handleExpenseSubmit} className="accounts-form">
          <Input id="expense-desc" label="Description" value={expenseForm.description} onChange={(e) => setExpenseForm({ ...expenseForm, description: e.target.value })} />
          <Input id="expense-amount" label="Amount" type="number" value={expenseForm.amount} onChange={(e) => setExpenseForm({ ...expenseForm, amount: Number(e.target.value) })} />
          <Input id="expense-account" label="Account ID" type="number" value={expenseForm.account_id} onChange={(e) => setExpenseForm({ ...expenseForm, account_id: Number(e.target.value) })} />
          <Input id="expense-reference" label="Reference" value={expenseForm.reference} onChange={(e) => setExpenseForm({ ...expenseForm, reference: e.target.value })} />
          <Button type="submit">Record Expense</Button>
        </form>
      </div>

      <div className="accounts-summary" style={{ marginTop: '24px' }}>
        <h3>Record Income</h3>
        <form onSubmit={handleIncomeSubmit} className="accounts-form">
          <Input id="income-desc" label="Description" value={incomeForm.description} onChange={(e) => setIncomeForm({ ...incomeForm, description: e.target.value })} />
          <Input id="income-amount" label="Amount" type="number" value={incomeForm.amount} onChange={(e) => setIncomeForm({ ...incomeForm, amount: Number(e.target.value) })} />
          <Input id="income-account" label="Account ID" type="number" value={incomeForm.account_id} onChange={(e) => setIncomeForm({ ...incomeForm, account_id: Number(e.target.value) })} />
          <Input id="income-reference" label="Reference" value={incomeForm.reference} onChange={(e) => setIncomeForm({ ...incomeForm, reference: e.target.value })} />
          <Button type="submit">Record Income</Button>
        </form>
      </div>

      <div className="accounts-summary" style={{ marginTop: '24px' }}>
        <h3>Recent Expenses</h3>
        <table className="accounts-table">
          <thead>
            <tr>
              <th>Description</th>
              <th>Amount</th>
              <th>Status</th>
            </tr>
          </thead>
          <tbody>
            {expenses.map((item) => (
              <tr key={item.id}>
                <td>{item.description}</td>
                <td>{item.amount}</td>
                <td>{item.status}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="accounts-summary" style={{ marginTop: '24px' }}>
        <h3>Recent Income</h3>
        <table className="accounts-table">
          <thead>
            <tr>
              <th>Description</th>
              <th>Amount</th>
              <th>Status</th>
            </tr>
          </thead>
          <tbody>
            {income.map((item) => (
              <tr key={item.id}>
                <td>{item.description}</td>
                <td>{item.amount}</td>
                <td>{item.status}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}

export default TransactionsPage
