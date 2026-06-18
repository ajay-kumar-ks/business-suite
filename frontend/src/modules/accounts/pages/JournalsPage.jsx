import React, { useEffect, useState } from 'react'
import '../../../styles/ModulePage.css'
import { accountsAPI } from '../../../services/api'
import Input from '../../../components/ui/Input'
import Button from '../../../components/ui/Button'

const JournalsPage = () => {
  const [journals, setJournals] = useState([])
  const [form, setForm] = useState({ reference: '', description: '', lines: [{ account_id: '', debit: 0, credit: 0 }, { account_id: '', debit: 0, credit: 0 }] })
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')

  const fetchJournals = async () => {
    try {
      const response = await accountsAPI.listJournals()
      setJournals(response.data)
    } catch (err) {
      setError(err.response?.data?.detail || 'Failed to load journals')
    }
  }

  useEffect(() => {
    fetchJournals()
  }, [])

  const handleLineChange = (index, field, value) => {
    const updatedLines = form.lines.map((line, idx) => (idx === index ? { ...line, [field]: value } : line))
    setForm({ ...form, lines: updatedLines })
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    try {
      await accountsAPI.createJournal(form)
      setSuccess('Journal created successfully!')
      setError('')
      setForm({ reference: '', description: '', lines: [{ account_id: '', debit: 0, credit: 0 }, { account_id: '', debit: 0, credit: 0 }] })
      fetchJournals()
    } catch (err) {
      setError(err.response?.data?.detail || 'Unable to create journal')
      setSuccess('')
    }
  }

  return (
    <div className="module-page">
      <h2>Journal Entries</h2>
      <p>Create and review journal entries for your accounting transactions.</p>

      <div className="accounts-summary">
        <h3>Create Journal Entry</h3>
        {error && <div className="error-message">{error}</div>}
        {success && <div className="success-message">{success}</div>}
        <form onSubmit={handleSubmit} className="accounts-form">
          <Input id="reference" label="Reference" value={form.reference} onChange={(e) => setForm({ ...form, reference: e.target.value })} />
          <Input id="description" label="Description" value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} />
          {form.lines.map((line, index) => (
            <div key={index} className="journal-line-row">
              <Input id={`account-${index}`} label={`Account ${index + 1}`} value={line.account_id} onChange={(e) => handleLineChange(index, 'account_id', Number(e.target.value))} />
              <Input id={`debit-${index}`} label="Debit" type="number" value={line.debit} onChange={(e) => handleLineChange(index, 'debit', Number(e.target.value))} />
              <Input id={`credit-${index}`} label="Credit" type="number" value={line.credit} onChange={(e) => handleLineChange(index, 'credit', Number(e.target.value))} />
            </div>
          ))}
          <Button type="submit">Create Journal</Button>
        </form>
      </div>

      <div className="accounts-summary" style={{ marginTop: '24px' }}>
        <h3>Journal History</h3>
        <table className="accounts-table">
          <thead>
            <tr>
              <th>Reference</th>
              <th>Description</th>
              <th>Status</th>
              <th>Date</th>
            </tr>
          </thead>
          <tbody>
            {journals.map((journal) => (
              <tr key={journal.id}>
                <td>{journal.reference}</td>
                <td>{journal.description}</td>
                <td>{journal.status}</td>
                <td>{new Date(journal.date).toLocaleDateString()}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}

export default JournalsPage
