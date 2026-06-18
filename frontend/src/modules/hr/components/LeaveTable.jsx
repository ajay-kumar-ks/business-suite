import React, { useState } from 'react'
import Button from '../../../components/ui/Button'
import { hrAPI } from '../services/hrApi'
import '../styles/HRPage.css'

const STATUS_COLORS = {
  'Pending': '#f59e0b',
  'Approved': '#22c55e',
  'Rejected': '#ef4444',
}

const LEAVE_TYPES = ['Casual Leave', 'Sick Leave', 'Emergency Leave']

const LeaveTable = ({ leaves = [], employees = [], loading, onRefresh }) => {
  const [showForm, setShowForm] = useState(false)
  const [form, setForm] = useState({
    employee_id: '',
    leave_type: 'Casual Leave',
    start_date: '',
    end_date: '',
    reason: '',
  })
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  const resetForm = () => {
    setForm({
      employee_id: '',
      leave_type: 'Casual Leave',
      start_date: '',
      end_date: '',
      reason: '',
    })
    setShowForm(false)
    setError('')
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!form.employee_id) {
      setError('Please select an employee')
      return
    }
    if (!form.start_date || !form.end_date) {
      setError('Start and end dates are required')
      return
    }
    if (form.start_date > form.end_date) {
      setError('Start date cannot be after end date')
      return
    }

    const payload = {
      employee_id: parseInt(form.employee_id, 10),
      leave_type: form.leave_type,
      start_date: form.start_date,
      end_date: form.end_date,
      reason: form.reason.trim() || null,
    }

    setSaving(true)
    setError('')
    try {
      await hrAPI.createLeave(payload)
      resetForm()
      onRefresh()
    } catch (err) {
      setError(err.response?.data?.detail || err.message || 'Failed to create leave request')
    } finally {
      setSaving(false)
    }
  }

  const handleApproveReject = async (leaveId, status) => {
    try {
      await hrAPI.updateLeaveStatus(leaveId, { status })
      onRefresh()
    } catch (err) {
      alert(err.response?.data?.detail || `Failed to ${status.toLowerCase()} leave request`)
    }
  }

  if (loading) {
    return (
      <div className="table-status">
        <div className="spinner" />
        <span>Loading leave requests...</span>
      </div>
    )
  }

  return (
    <div className="leave-management">
      {/* ── Create Leave Form ── */}
      {showForm && (
        <div className="inline-form">
          <div className="inline-form-header">
            <h4>Request Leave</h4>
            <button className="modal-close" onClick={resetForm} type="button">✕</button>
          </div>
          <form onSubmit={handleSubmit} className="inline-form-body">
            {error && <div className="form-error">{error}</div>}
            <div className="form-row">
              <div className="form-group">
                <label htmlFor="lv_employee">Employee *</label>
                <select
                  id="lv_employee"
                  value={form.employee_id}
                  onChange={(e) => setForm({ ...form, employee_id: e.target.value })}
                  required
                >
                  <option value="">Select employee...</option>
                  {employees.map((emp) => (
                    <option key={emp.id} value={emp.id}>
                      {emp.employee_code} — {emp.user_name || `User #${emp.user_id}`}
                    </option>
                  ))}
                </select>
              </div>
              <div className="form-group">
                <label htmlFor="lv_type">Leave Type *</label>
                <select
                  id="lv_type"
                  value={form.leave_type}
                  onChange={(e) => setForm({ ...form, leave_type: e.target.value })}
                >
                  {LEAVE_TYPES.map((t) => (
                    <option key={t} value={t}>{t}</option>
                  ))}
                </select>
              </div>
            </div>
            <div className="form-row">
              <div className="form-group">
                <label htmlFor="lv_start">Start Date *</label>
                <input
                  id="lv_start"
                  type="date"
                  value={form.start_date}
                  onChange={(e) => setForm({ ...form, start_date: e.target.value })}
                  required
                />
              </div>
              <div className="form-group">
                <label htmlFor="lv_end">End Date *</label>
                <input
                  id="lv_end"
                  type="date"
                  value={form.end_date}
                  onChange={(e) => setForm({ ...form, end_date: e.target.value })}
                  required
                />
              </div>
            </div>
            <div className="form-row" style={{ gridTemplateColumns: '1fr' }}>
              <div className="form-group">
                <label htmlFor="lv_reason">Reason</label>
                <textarea
                  id="lv_reason"
                  value={form.reason}
                  onChange={(e) => setForm({ ...form, reason: e.target.value })}
                  placeholder="Optional reason for leave"
                  rows={3}
                />
              </div>
            </div>
            <div className="modal-actions">
              <Button type="button" variant="secondary" onClick={resetForm}>Cancel</Button>
              <Button type="submit" variant="primary" disabled={saving}>
                {saving ? 'Submitting...' : 'Submit Request'}
              </Button>
            </div>
          </form>
        </div>
      )}

      {/* ── Leave Records ── */}
      {!leaves.length && !showForm ? (
        <div className="table-status empty">
          <span>No leave requests yet.</span>
          <Button variant="primary" onClick={() => setShowForm(true)}>
            + Request Leave
          </Button>
        </div>
      ) : (
        <div>
          <div className="inline-table-header">
            <span className="count-badge">{leaves.length} requests</span>
            <Button variant="primary" size="sm" onClick={() => { resetForm(); setShowForm(true); }}>
              + Request Leave
            </Button>
          </div>
          <div className="table-wrapper">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Employee</th>
                  <th>Leave Type</th>
                  <th>Start Date</th>
                  <th>End Date</th>
                  <th>Reason</th>
                  <th>Status</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {leaves.map((lv) => (
                  <tr key={lv.id}>
                    <td className="name-cell">{lv.employee_name || '—'}</td>
                    <td>{lv.leave_type}</td>
                    <td>{lv.start_date ? new Date(lv.start_date).toLocaleDateString() : '—'}</td>
                    <td>{lv.end_date ? new Date(lv.end_date).toLocaleDateString() : '—'}</td>
                    <td className="reason-cell">{lv.reason || '—'}</td>
                    <td>
                      <span
                        className="status-badge"
                        style={{ backgroundColor: STATUS_COLORS[lv.status] || '#6b7280' }}
                      >
                        {lv.status}
                      </span>
                    </td>
                    <td className="actions-cell">
                      {lv.status === 'Pending' ? (
                        <>
                          <button
                            className="action-btn approve"
                            onClick={() => handleApproveReject(lv.id, 'Approved')}
                            title="Approve"
                          >
                            ✅
                          </button>
                          <button
                            className="action-btn reject"
                            onClick={() => handleApproveReject(lv.id, 'Rejected')}
                            title="Reject"
                          >
                            ❌
                          </button>
                        </>
                      ) : (
                        <span className="text-muted">—</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  )
}

export default LeaveTable
