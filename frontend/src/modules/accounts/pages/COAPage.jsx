import React, { useEffect, useState } from 'react'
import '../../../styles/ModulePage.css'
import '../../../modules/accounts/styles/AccountsPage.css'
import { accountsAPI } from '../../../services/api'
import { useAccountsPermissions, isPageAllowed } from '../accountsPermissions'
import Input from '../../../components/ui/Input'
import Button from '../../../components/ui/Button'

const COAPage = () => {
  const { department, canPerformAction, loading } = useAccountsPermissions()
  if (loading) return <div className="module-page"><p>Loading...</p></div>
  if (!isPageAllowed(department, 'coa')) {
    return (
      <div className="module-page">
        <h2>Access Denied</h2>
        <p>You do not have permission to view the Chart of Accounts.</p>
      </div>
    )
  }
  const [accounts, setAccounts] = useState([])
  const [form, setForm] = useState({ account_code: '', account_name: '', account_type: 'Asset' })
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')

  const fetchAccounts = async () => {
    try {
      const response = await accountsAPI.listCOA()
      setAccounts(response.data)
    } catch (err) {
      setError(err.response?.data?.detail || 'Failed to load accounts')
    }
  }

  useEffect(() => {
    fetchAccounts()
  }, [])

  const handleSubmit = async (e) => {
    e.preventDefault()
    try {
      await accountsAPI.createCOA(form)
      setSuccess('Account created successfully!')
      setError('')
      setForm({ account_code: '', account_name: '', account_type: 'Asset' })
      fetchAccounts()
    } catch (err) {
      setError(err.response?.data?.detail || 'Unable to create account')
      setSuccess('')
    }
  }

  return (
    <div className="module-page">
      <h2>Chart of Accounts</h2>
      <p>Manage account structure and add new chart of accounts entries.</p>

      <div className="accounts-summary">
        <h3>Create New Account</h3>
        {error && <div className="error-message">{error}</div>}
        {success && <div className="success-message">{success}</div>}

        {canPerformAction('createCOA') ? (
          <form onSubmit={handleSubmit} className="accounts-form">
            <Input
              id="code"
              label="Account Code"
              value={form.account_code}
              onChange={(e) => setForm({ ...form, account_code: e.target.value })}
            />
            <Input
              id="name"
              label="Account Name"
              value={form.account_name}
              onChange={(e) => setForm({ ...form, account_name: e.target.value })}
            />
            <label className="ui-input-label" htmlFor="type">Account Type</label>
            <select
              id="type"
              className="ui-input-field"
              value={form.account_type}
              onChange={(e) => setForm({ ...form, account_type: e.target.value })}
            >
              <option>Asset</option>
              <option>Liability</option>
              <option>Equity</option>
              <option>Revenue</option>
              <option>Expense</option>
            </select>
            <Button type="submit">Create Account</Button>
          </form>
        ) : (
          <div className="permission-warning" style={{ padding: '14px', border: '1px solid #f59e0b', borderRadius: '8px', background: '#fffbeb' }}>
            You do not have permission to create chart of accounts entries.
          </div>
        )}
      </div>

      <div className="accounts-summary" style={{ marginTop: '24px' }}>
        <h3>Accounts List</h3>
        <table className="accounts-table">
          <thead>
            <tr>
              <th>Code</th>
              <th>Name</th>
              <th>Type</th>
              <th>Status</th>
            </tr>
          </thead>
          <tbody>
            {accounts.map((acct) => (
              <tr key={acct.id}>
                <td>{acct.account_code}</td>
                <td>{acct.account_name}</td>
                <td>{acct.account_type}</td>
                <td>{acct.is_active ? 'Active' : 'Inactive'}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}

export default COAPage
