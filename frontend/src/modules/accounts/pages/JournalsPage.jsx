import React, { useEffect, useState, useCallback } from 'react'
import '../../../styles/ModulePage.css'
import { accountsAPI, getAPIErrorMessage } from '../../../services/api'
import { useAccountsPermissions, isPageAllowed } from '../accountsPermissions'
import Input from '../../../components/ui/Input'
import Button from '../../../components/ui/Button'
import { ChevronDown, ChevronUp } from 'lucide-react'

const JournalsPage = () => {
  const { department, canPerformAction, loading } = useAccountsPermissions()
  if (loading) return <div className="module-page"><p>Loading...</p></div>
  if (!isPageAllowed(department, 'journals')) {
    return (
      <div className="module-page">
        <h2>Access Denied</h2>
        <p>You do not have permission to view Journals.</p>
      </div>
    )
  }
  const [journals, setJournals] = useState([])
  const [accounts, setAccounts] = useState([])
  const [form, setForm] = useState({ reference: '', description: '', lines: [{ account_id: '', debit: 0, credit: 0 }, { account_id: '', debit: 0, credit: 0 }] })
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  const [expandedId, setExpandedId] = useState(null)
  const [loadingAction, setLoadingAction] = useState(null)

  const fetchJournals = useCallback(async () => {
    try {
      const response = await accountsAPI.listJournals()
      setJournals(response.data)
    } catch (err) {
      setError(getAPIErrorMessage(err, 'Failed to load journals'))
    }
  }, [])

  const fetchAccounts = useCallback(async () => {
    try {
      const response = await accountsAPI.listCOA()
      setAccounts(response.data)
    } catch (err) {
      // silently fail
    }
  }, [])

  useEffect(() => {
    fetchJournals()
    fetchAccounts()
  }, [fetchJournals, fetchAccounts])

  const getAccountName = (id) => {
    const acct = accounts.find(a => a.id === Number(id))
    return acct ? `${acct.account_code} - ${acct.account_name}` : `Account #${id}`
  }

  const handleLineChange = (index, field, value) => {
    const updatedLines = form.lines.map((line, idx) => (idx === index ? { ...line, [field]: value } : line))
    setForm({ ...form, lines: updatedLines })
  }

  const addLine = () => {
    setForm({ ...form, lines: [...form.lines, { account_id: '', debit: 0, credit: 0 }] })
  }

  const removeLine = (index) => {
    if (form.lines.length <= 2) return
    setForm({ ...form, lines: form.lines.filter((_, i) => i !== index) })
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
      setError(getAPIErrorMessage(err, 'Unable to create journal'))
      setSuccess('')
    }
  }

  const handleAction = async (id, action) => {
    setLoadingAction(`${action}-${id}`)
    try {
      if (action === 'submit') await accountsAPI.submitJournal(id)
      else if (action === 'approve') await accountsAPI.approveJournal(id)
      else if (action === 'post') await accountsAPI.postJournal(id)
      setSuccess(`Journal ${action}d successfully!`)
      setError('')
      fetchJournals()
    } catch (err) {
      setError(getAPIErrorMessage(err, `Failed to ${action} journal`))
      setSuccess('')
    } finally {
      setLoadingAction(null)
    }
  }

  const toggleExpand = (id) => {
    setExpandedId(expandedId === id ? null : id)
  }

  const StatusBadge = ({ status }) => (
    <span className={`status-badge ${status}`}>{status}</span>
  )

  return (
    <div className="module-page">
      <h2>Journal Entries</h2>
      <p>Create and review journal entries for your accounting transactions.</p>

      <div className="accounts-summary">
        <h3>Create Journal Entry</h3>
        {error && <div className="error-message">{error}</div>}
        {success && <div className="success-message">{success}</div>}
        {canPerformAction('createJournal') ? (
          <form onSubmit={handleSubmit} className="accounts-form">
            <Input id="reference" label="Reference" value={form.reference} onChange={(e) => setForm({ ...form, reference: e.target.value })} />
            <Input id="description" label="Description" value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} />
            {form.lines.map((line, index) => (
            <div key={index} className="journal-line-row">
              <div>
                <label className="ui-input-label">Account #{index + 1}</label>
                <select
                  className="ui-input-field"
                  value={line.account_id}
                  onChange={(e) => handleLineChange(index, 'account_id', e.target.value === '' ? '' : Number(e.target.value))}
                >
                  <option value="">Select account</option>
                  {accounts.map((acct) => (
                    <option key={acct.id} value={acct.id}>{acct.account_code} - {acct.account_name} ({acct.account_type})</option>
                  ))}
                </select>
              </div>
              <Input id={`debit-${index}`} label="Debit" type="number" value={line.debit} onChange={(e) => handleLineChange(index, 'debit', Number(e.target.value))} />
              <Input id={`credit-${index}`} label="Credit" type="number" value={line.credit} onChange={(e) => handleLineChange(index, 'credit', Number(e.target.value))} />
              {form.lines.length > 2 && (
                <button type="button" className="action-btn" onClick={() => removeLine(index)} style={{ alignSelf: 'end' }}>✕</button>
              )}
            </div>
          ))}
          <div style={{ display: 'flex', gap: '10px' }}>
            <Button type="button" onClick={addLine} variant="secondary">+ Add Line</Button>
            <Button type="submit">Create Journal</Button>
          </div>
        </form>
        ) : (
          <div className="permission-warning" style={{ padding: '14px', border: '1px solid #f59e0b', borderRadius: '8px', background: '#fffbeb' }}>
            You do not have permission to create journal entries.
          </div>
        )}
      </div>

      <div className="accounts-summary" style={{ marginTop: '24px' }}>
        <h3>Journal History</h3>
        <table className="accounts-table">
          <thead>
            <tr>
              <th style={{ width: '30px' }}></th>
              <th>Reference</th>
              <th>Description</th>
              <th>Status</th>
              <th>Date</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {journals.length === 0 ? (
              <tr><td colSpan="6" className="empty-state">No journal entries yet.</td></tr>
            ) : (
              journals.map((journal) => (
                <React.Fragment key={journal.id}>
                  <tr className="clickable-row" onClick={() => toggleExpand(journal.id)}>
                    <td>{expandedId === journal.id ? <ChevronUp size={16} /> : <ChevronDown size={16} />}</td>
                    <td>{journal.reference || '—'}</td>
                    <td>{journal.description || '—'}</td>
                    <td><StatusBadge status={journal.status} /></td>
                    <td>{new Date(journal.date).toLocaleDateString()}</td>
                    <td>
                      <div style={{ display: 'flex', gap: '4px', flexWrap: 'wrap' }}>
                        {journal.status === 'draft' && canPerformAction('submitJournal') && (
                          <button
                            className="action-btn info"
                            onClick={(e) => { e.stopPropagation(); handleAction(journal.id, 'submit') }}
                            disabled={loadingAction === `submit-${journal.id}`}
                          >
                            {loadingAction === `submit-${journal.id}` ? '...' : 'Submit'}
                          </button>
                        )}
                        {journal.status === 'submitted' && canPerformAction('approveJournal') && (
                          <button
                            className="action-btn success"
                            onClick={(e) => { e.stopPropagation(); handleAction(journal.id, 'approve') }}
                            disabled={loadingAction === `approve-${journal.id}`}
                          >
                            {loadingAction === `approve-${journal.id}` ? '...' : 'Approve'}
                          </button>
                        )}
                        {journal.status === 'approved' && canPerformAction('postJournal') && (
                          <button
                            className="action-btn primary"
                            onClick={(e) => { e.stopPropagation(); handleAction(journal.id, 'post') }}
                            disabled={loadingAction === `post-${journal.id}`}
                          >
                            {loadingAction === `post-${journal.id}` ? '...' : 'Post'}
                          </button>
                        )}
                        {journal.status === 'posted' && (
                          <span style={{ fontSize: '0.78rem', color: '#059669', fontWeight: 600 }}>✓ Posted</span>
                        )}
                      </div>
                    </td>
                  </tr>
                  {expandedId === journal.id && (
                    <tr className="detail-row">
                      <td colSpan="6">
                        <div style={{ fontWeight: 600, marginBottom: '8px', color: 'var(--text)' }}>Journal Lines</div>
                        <table className="journal-lines-table">
                          <thead>
                            <tr>
                              <th>Account</th>
                              <th>Debit</th>
                              <th>Credit</th>
                            </tr>
                          </thead>
                          <tbody>
                            {(journal.lines || []).map((line) => (
                              <tr key={line.id}>
                                <td>{getAccountName(line.account_id)}</td>
                                <td>{Number(line.debit).toLocaleString('en-IN', { minimumFractionDigits: 2 })}</td>
                                <td>{Number(line.credit).toLocaleString('en-IN', { minimumFractionDigits: 2 })}</td>
                              </tr>
                            ))}
                            <tr style={{ fontWeight: 700 }}>
                              <td><strong>Total</strong></td>
                              <td>{Number(journal.lines?.reduce((s, l) => s + Number(l.debit), 0) || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}</td>
                              <td>{Number(journal.lines?.reduce((s, l) => s + Number(l.credit), 0) || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}</td>
                            </tr>
                          </tbody>
                        </table>
                      </td>
                    </tr>
                  )}
                </React.Fragment>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  )
}

export default JournalsPage
