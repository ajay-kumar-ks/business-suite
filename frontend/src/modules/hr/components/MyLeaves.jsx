import React, { useState, useEffect, useCallback } from 'react'
import { Plus, X, Calendar } from 'lucide-react'
import Button from '../../../components/ui/Button'
import { hrAPI } from '../services/hrApi'
import Loader from '../../../components/ui/Loader'
import '../styles/HRPage.css'
import '../styles/EmployeeDashboard.css'

const LEAVE_TYPES = ['Casual Leave', 'Sick Leave', 'Emergency Leave']

const EMPTY_FORM = {
  leave_type: 'Casual Leave',
  start_date: '',
  end_date: '',
  reason: '',
}

const MyLeaves = () => {
  const [leaves, setLeaves] = useState([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [form, setForm] = useState(EMPTY_FORM)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')

  const fetchLeaves = useCallback(async () => {
    try {
      const res = await hrAPI.getMyLeaves()
      setLeaves(res.data || [])
    } catch (err) {
      console.error('Failed to fetch leaves:', err)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchLeaves()
  }, [fetchLeaves])

  const resetForm = () => {
    setForm(EMPTY_FORM)
    setShowForm(false)
    setError('')
    setSuccess('')
  }

  const handleChange = (field) => (e) => {
    setForm((prev) => ({ ...prev, [field]: e.target.value }))
    if (error) setError('')
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!form.start_date || !form.end_date) {
      setError('Start and end dates are required')
      return
    }
    if (form.start_date > form.end_date) {
      setError('Start date cannot be after end date')
      return
    }

    setSaving(true)
    setError('')
    setSuccess('')
    try {
      await hrAPI.createMyLeave({
        leave_type: form.leave_type,
        start_date: form.start_date,
        end_date: form.end_date,
        reason: form.reason.trim() || null,
      })
      resetForm()
      setSuccess('✓ Leave request submitted successfully!')
      fetchLeaves()
    } catch (err) {
      setError(err.response?.data?.detail || err.message || 'Failed to submit leave request')
    } finally {
      setSaving(false)
    }
  }

  // Summary stats
  const totalLeaves = leaves.length
  const approvedLeaves = leaves.filter((l) => l.status === 'Approved').length
  const pendingLeaves = leaves.filter((l) => l.status === 'Pending').length

  const formatDate = (dateStr) => {
    if (!dateStr) return '—'
    return new Date(dateStr).toLocaleDateString('en-US', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
    })
  }

  if (loading) {
    return (
      <div className="emp-loader-wrapper">
        <Loader fullScreen={false} size={30} />
      </div>
    )
  }

  return (
    <div className="emp-dashboard">
      {/* ── Summary Cards ── */}
      <div className="leaves-summary">
        <div className="leaves-summary-card summary-card-total">
          <div className="summary-value">{totalLeaves}</div>
          <div className="summary-label">Total Leaves</div>
        </div>
        <div className="leaves-summary-card summary-card-approved">
          <div className="summary-value">{approvedLeaves}</div>
          <div className="summary-label">Approved</div>
        </div>
        <div className="leaves-summary-card summary-card-pending">
          <div className="summary-value">{pendingLeaves}</div>
          <div className="summary-label">Pending</div>
        </div>
      </div>

      {/* ── Success Message ── */}
      {success && <div className="form-success">{success}</div>}

      {/* ── Leave Application Form ── */}
      {showForm ? (
        <div className="leave-form-card">
          <div className="leave-form-header">
            <h3>Leave Application</h3>
            <button className="modal-close" onClick={resetForm} type="button" title="Close"><X size={18} /></button>
          </div>
          <form onSubmit={handleSubmit} className="leave-form-body">
            {error && <div className="form-error">{error}</div>}
            <div className="form-row">
              <div className="form-group">
                <label htmlFor="lv_type">Leave Type *</label>
                <select
                  id="lv_type"
                  value={form.leave_type}
                  onChange={handleChange('leave_type')}
                >
                  {LEAVE_TYPES.map((t) => (
                    <option key={t} value={t}>{t}</option>
                  ))}
                </select>
              </div>
              <div className="form-group">
                <label htmlFor="lv_start">Start Date *</label>
                <input
                  id="lv_start"
                  type="date"
                  value={form.start_date}
                  onChange={handleChange('start_date')}
                  required
                />
              </div>
            </div>
            <div className="form-row">
              <div className="form-group">
                <label htmlFor="lv_end">End Date *</label>
                <input
                  id="lv_end"
                  type="date"
                  value={form.end_date}
                  onChange={handleChange('end_date')}
                  required
                />
              </div>
              <div className="form-group">
                <label htmlFor="lv_type_s">Duration</label>
                <input
                  type="text"
                  value={
                    form.start_date && form.end_date
                      ? (() => {
                          const start = new Date(form.start_date)
                          const end = new Date(form.end_date)
                          const diff = Math.max(0, Math.ceil((end - start) / (1000 * 60 * 60 * 24)) + 1)
                          return `${diff} day${diff !== 1 ? 's' : ''}`
                        })()
                      : ''
                  }
                  readOnly
                  placeholder="Select dates"
                />
              </div>
            </div>
            <div className="form-row" style={{ gridTemplateColumns: '1fr' }}>
              <div className="form-group">
                <label htmlFor="lv_reason">Reason</label>
                <textarea
                  id="lv_reason"
                  value={form.reason}
                  onChange={handleChange('reason')}
                  placeholder="Optional reason for leave"
                  rows={3}
                />
              </div>
            </div>
            <div className="leave-form-actions">
              <Button type="button" variant="secondary" onClick={resetForm}>Cancel</Button>
              <Button type="submit" variant="primary" disabled={saving}>
                {saving ? 'Submitting...' : 'Submit Request'}
              </Button>
            </div>
          </form>
        </div>
      ) : (
        <div style={{ marginBottom: '24px' }}>
          <Button variant="primary" onClick={() => { setShowForm(true); setSuccess(''); }}>
            <Plus size={16} style={{ marginRight: 4 }} />
            Request Leave
          </Button>
        </div>
      )}

      {/* ── Leave History ── */}
      <div className="leave-history-card">
        <div className="section-header">
          <h3>Leave History</h3>
          <span className="count-badge">{leaves.length} requests</span>
        </div>
        {!leaves.length ? (
          <div className="emp-empty-state">
            <div className="empty-icon" style={{ opacity: 0.5 }}><Calendar size={40} /></div>
            <div className="empty-text">No leave requests yet.</div>
          </div>
        ) : (
          <div className="emp-table-wrapper">
            <table className="emp-table">
              <thead>
                <tr>
                  <th>Leave Type</th>
                  <th>Start Date</th>
                  <th>End Date</th>
                  <th>Days</th>
                  <th>Reason</th>
                  <th>Status</th>
                </tr>
              </thead>
              <tbody>
                {leaves.map((lv) => {
                  const days = lv.start_date && lv.end_date
                    ? Math.max(0, Math.ceil((new Date(lv.end_date) - new Date(lv.start_date)) / (1000 * 60 * 60 * 24)) + 1)
                    : 0
                  return (
                    <tr key={lv.id}>
                      <td><strong>{lv.leave_type}</strong></td>
                      <td>{formatDate(lv.start_date)}</td>
                      <td>{formatDate(lv.end_date)}</td>
                      <td>{days}</td>
                      <td style={{ maxWidth: '180px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{lv.reason || '—'}</td>
                      <td>
                        <span className={`emp-status-badge ${lv.status?.toLowerCase()}`}>
                          {lv.status}
                        </span>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  )
}

export default MyLeaves
