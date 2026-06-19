import React, { useEffect, useState } from 'react'
import '../../../styles/ModulePage.css'
import { accountsAPI } from '../../../services/api'
import Input from '../../../components/ui/Input'
import Button from '../../../components/ui/Button'

const BudgetsPage = () => {
  const [budgets, setBudgets] = useState([])
  const [form, setForm] = useState({ name: '', fiscal_year: new Date().getFullYear(), total_amount: 0, start_date: '', end_date: '', status: 'draft' })
  const [message, setMessage] = useState('')

  const loadBudgets = async () => {
    try {
      const response = await accountsAPI.listBudgets()
      setBudgets(response.data)
    } catch (err) {
      setMessage('Unable to load budgets')
    }
  }

  useEffect(() => {
    loadBudgets()
  }, [])

  const handleSubmit = async (e) => {
    e.preventDefault()
    try {
      await accountsAPI.createBudget(form)
      setMessage('Budget created')
      setForm({ name: '', fiscal_year: new Date().getFullYear(), total_amount: 0, start_date: '', end_date: '', status: 'draft' })
      loadBudgets()
    } catch (err) {
      setMessage(err.response?.data?.detail || 'Unable to create budget')
    }
  }

  return (
    <div className="module-page">
      <h2>Budgets</h2>
      <p>Define budgets by fiscal year and review budget allocations.</p>
      {message && <div className="success-message">{message}</div>}

      <div className="accounts-summary">
        <h3>Create Budget</h3>
        <form onSubmit={handleSubmit} className="accounts-form">
          <Input id="budget-name" label="Name" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
          <Input id="budget-year" label="Fiscal Year" type="number" value={form.fiscal_year} onChange={(e) => setForm({ ...form, fiscal_year: Number(e.target.value) })} />
          <Input id="budget-amount" label="Total Amount" type="number" value={form.total_amount} onChange={(e) => setForm({ ...form, total_amount: Number(e.target.value) })} />
          <Input id="budget-start" label="Start Date" type="date" value={form.start_date} onChange={(e) => setForm({ ...form, start_date: e.target.value })} />
          <Input id="budget-end" label="End Date" type="date" value={form.end_date} onChange={(e) => setForm({ ...form, end_date: e.target.value })} />
          <label className="ui-input-label" htmlFor="budget-status">Status</label>
          <select id="budget-status" className="ui-input-field" value={form.status} onChange={(e) => setForm({ ...form, status: e.target.value })}>
            <option value="draft">Draft</option>
            <option value="active">Active</option>
            <option value="completed">Completed</option>
          </select>
          <Button type="submit">Create Budget</Button>
        </form>
      </div>

      <div className="accounts-summary" style={{ marginTop: '24px' }}>
        <h3>Existing Budgets</h3>
        <table className="accounts-table">
          <thead>
            <tr>
              <th>Name</th>
              <th>Fiscal Year</th>
              <th>Total Amount</th>
              <th>Status</th>
            </tr>
          </thead>
          <tbody>
            {budgets.map((budget) => (
              <tr key={budget.id}>
                <td>{budget.name}</td>
                <td>{budget.fiscal_year}</td>
                <td>{budget.total_amount}</td>
                <td>{budget.status}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}

export default BudgetsPage
