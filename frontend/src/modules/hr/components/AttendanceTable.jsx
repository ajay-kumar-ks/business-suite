import React, { useState } from 'react'
import Button from '../../../components/ui/Button'
import { hrAPI } from '../services/hrApi'
import '../styles/HRPage.css'

const STATUS_COLORS = {
  'Present': '#22c55e',
  'Absent': '#ef4444',
  'Half Day': '#f59e0b',
  'Leave': '#3b82f6',
}

const AttendanceTable = ({
  attendanceRecords = [],
  employees = [],
  loading,
  onRefresh,
}) => {
  const [showForm, setShowForm] = useState(false)
  const [form, setForm] = useState({
    employee_id: '',
    date: new Date().toISOString().split('T')[0],
    status: 'Present',
    check_in: '',
    check_out: '',
  })
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  const resetForm = () => {
    setForm({
      employee_id: '',
      date: new Date().toISOString().split('T')[0],
      status: 'Present',
      check_in: '',
      check_out: '',
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

    const payload = {
      employee_id: parseInt(form.employee_id, 10),
      date: form.date,
      status: form.status,
      check_in: form.check_in || undefined,
      check_out: form.check_out || undefined,
    }

    setSaving(true)
    setError('')
    try {
      await hrAPI.markAttendance(payload)
      resetForm()
      onRefresh()
    } catch (err) {
      setError(err.response?.data?.detail || err.message || 'Failed to mark attendance')
    } finally {
      setSaving(false)
    }
  }

  if (loading) {
    return (
      <div className="table-status">
        <div className="spinner" />
        <span>Loading attendance records...</span>
      </div>
    )
  }

  return (
    <div className="attendance-management">
      {/* ── Mark Attendance Form ── */}
      {showForm && (
        <div className="inline-form">
          <div className="inline-form-header">
            <h4>Mark Attendance</h4>
            <button className="modal-close" onClick={resetForm} type="button">✕</button>
          </div>
          <form onSubmit={handleSubmit} className="inline-form-body">
            {error && <div className="form-error">{error}</div>}
            <div className="form-row">
              <div className="form-group">
                <label htmlFor="att_employee">Employee *</label>
                <select
                  id="att_employee"
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
                <label htmlFor="att_date">Date *</label>
                <input
                  id="att_date"
                  type="date"
                  value={form.date}
                  onChange={(e) => setForm({ ...form, date: e.target.value })}
                  required
                />
              </div>
            </div>
            <div className="form-row">
              <div className="form-group">
                <label htmlFor="att_status">Status *</label>
                <select
                  id="att_status"
                  value={form.status}
                  onChange={(e) => setForm({ ...form, status: e.target.value })}
                >
                  <option value="Present">Present</option>
                  <option value="Absent">Absent</option>
                  <option value="Half Day">Half Day</option>
                  <option value="Leave">Leave</option>
                </select>
              </div>
              <div className="form-group">
                <label htmlFor="att_check_in">Check In</label>
                <input
                  id="att_check_in"
                  type="datetime-local"
                  value={form.check_in}
                  onChange={(e) => setForm({ ...form, check_in: e.target.value })}
                />
              </div>
            </div>
            <div className="form-row">
              <div className="form-group">
                <label htmlFor="att_check_out">Check Out</label>
                <input
                  id="att_check_out"
                  type="datetime-local"
                  value={form.check_out}
                  onChange={(e) => setForm({ ...form, check_out: e.target.value })}
                />
              </div>
              <div className="form-group" />
            </div>
            <div className="modal-actions">
              <Button type="button" variant="secondary" onClick={resetForm}>Cancel</Button>
              <Button type="submit" variant="primary" disabled={saving}>
                {saving ? 'Saving...' : 'Mark Attendance'}
              </Button>
            </div>
          </form>
        </div>
      )}

      {/* ── Attendance Records ── */}
      {!attendanceRecords.length && !showForm ? (
        <div className="table-status empty">
          <span>No attendance records yet.</span>
          <Button variant="primary" onClick={() => setShowForm(true)}>
            + Mark Attendance
          </Button>
        </div>
      ) : (
        <div>
          <div className="inline-table-header">
            <span className="count-badge">{attendanceRecords.length} records</span>
            <Button variant="primary" size="sm" onClick={() => { resetForm(); setShowForm(true); }}>
              + Mark Attendance
            </Button>
          </div>
          <div className="table-wrapper">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Employee</th>
                  <th>Code</th>
                  <th>Date</th>
                  <th>Check In</th>
                  <th>Check Out</th>
                  <th>Status</th>
                </tr>
              </thead>
              <tbody>
                {attendanceRecords.map((rec) => (
                  <tr key={rec.id}>
                    <td className="name-cell">{rec.employee_name || '—'}</td>
                    <td className="code-cell">{rec.employee_code || '—'}</td>
                    <td>{rec.date ? new Date(rec.date).toLocaleDateString() : '—'}</td>
                    <td>{rec.check_in ? new Date(rec.check_in).toLocaleTimeString() : '—'}</td>
                    <td>{rec.check_out ? new Date(rec.check_out).toLocaleTimeString() : '—'}</td>
                    <td>
                      <span
                        className="status-badge"
                        style={{ backgroundColor: STATUS_COLORS[rec.status] || '#6b7280' }}
                      >
                        {rec.status}
                      </span>
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

export default AttendanceTable
