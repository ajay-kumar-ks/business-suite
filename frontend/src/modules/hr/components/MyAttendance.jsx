import React, { useState, useEffect, useCallback } from 'react'
import { LogIn, LogOut, ClipboardList, Hourglass } from 'lucide-react'
import Loader from '../../../components/ui/Loader'
import { hrAPI } from '../services/hrApi'
import '../styles/HRPage.css'
import '../styles/EmployeeDashboard.css'

const STATS = {
  present: { label: 'Present Days', color: '#22c55e' },
  absent: { label: 'Absent Days', color: '#ef4444' },
  total: { label: 'Total Days', color: '#2563eb' },
}

const MyAttendance = () => {
  const [records, setRecords] = useState([])
  const [loading, setLoading] = useState(true)
  const [checkingIn, setCheckingIn] = useState(false)
  const [checkingOut, setCheckingOut] = useState(false)
  const [message, setMessage] = useState({ type: '', text: '' })

  const fetchRecords = useCallback(async () => {
    try {
      const res = await hrAPI.getMyAttendance()
      setRecords(res.data || [])
    } catch (err) {
      console.error('Failed to fetch attendance:', err)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchRecords()
  }, [fetchRecords])

  const todayRecord = records.find((r) => {
    const today = new Date().toISOString().split('T')[0]
    return r.date === today || r.date?.startsWith(today)
  })

  const isCheckedIn = !!todayRecord?.check_in
  const isCheckedOut = !!todayRecord?.check_out

  // Summary stats
  const presentCount = records.filter((r) => r.status === 'Present').length
  const absentCount = records.filter((r) => r.status === 'Absent').length

  const handleCheckIn = async () => {
    setCheckingIn(true)
    setMessage({ type: '', text: '' })
    try {
      await hrAPI.checkIn()
      setMessage({ type: 'success', text: '✓ Checked in successfully!' })
      fetchRecords()
    } catch (err) {
      setMessage({ type: 'error', text: err.response?.data?.detail || 'Failed to check in' })
    } finally {
      setCheckingIn(false)
    }
  }

  const handleCheckOut = async () => {
    setCheckingOut(true)
    setMessage({ type: '', text: '' })
    try {
      await hrAPI.checkOut()
      setMessage({ type: 'success', text: '✓ Checked out successfully!' })
      fetchRecords()
    } catch (err) {
      setMessage({ type: 'error', text: err.response?.data?.detail || 'Failed to check out' })
    } finally {
      setCheckingOut(false)
    }
  }

  const formatTime = (dt) => {
    if (!dt) return '—'
    return new Date(dt).toLocaleTimeString('en-US', {
      hour: '2-digit',
      minute: '2-digit',
      hour12: true,
    })
  }

  const calcHours = (checkIn, checkOut) => {
    if (!checkIn || !checkOut) return '—'
    const diff = new Date(checkOut) - new Date(checkIn)
    const hrs = Math.floor(diff / 3600000)
    const mins = Math.floor((diff % 3600000) / 60000)
    return `${hrs}h ${mins.toString().padStart(2, '0')}m`
  }

  if (loading) {
    return (
      <div className="emp-loader-wrapper">
        <Loader fullScreen={false} size={30} />
      </div>
    )
  }

  const getStatusClass = (status) => {
    const map = { Present: 'present', Absent: 'absent', 'Half Day': 'half-day', Leave: 'leave' }
    return map[status] || ''
  }

  return (
    <div className="emp-dashboard">
      {/* ── Summary Cards ── */}
      <div className="attendance-summary">
        <div className="attendance-summary-card summary-card-present">
          <div className="summary-value">{presentCount}</div>
          <div className="summary-label">{STATS.present.label}</div>
        </div>
        <div className="attendance-summary-card summary-card-absent">
          <div className="summary-value">{absentCount}</div>
          <div className="summary-label">{STATS.absent.label}</div>
        </div>
        <div className="attendance-summary-card summary-card-total">
          <div className="summary-value">{records.length}</div>
          <div className="summary-label">{STATS.total.label}</div>
        </div>
      </div>

      {/* ── Today's Attendance Card ── */}
      <div className="today-attendance-card">
        <div className="today-attendance-header">
          <h3>Today's Attendance</h3>
          <span className={`today-status-indicator ${isCheckedIn ? (isCheckedOut ? 'checked-out' : 'checked-in') : 'not-checked'}`}>
            <span className="today-status-dot" />
            {isCheckedIn
              ? isCheckedOut
                ? 'Completed'
                : 'Checked In'
              : 'Not Checked In'}
          </span>
        </div>

        <div className="today-times-grid">
          <div className="today-time-box">
            <span className="time-label">Check In</span>
            <span className={`time-value ${!todayRecord?.check_in ? 'time-empty' : ''}`}>
              {todayRecord ? formatTime(todayRecord.check_in) : '--:--'}
            </span>
          </div>
          <div className="today-time-box">
            <span className="time-label">Check Out</span>
            <span className={`time-value ${!todayRecord?.check_out ? 'time-empty' : ''}`}>
              {todayRecord ? formatTime(todayRecord.check_out) : '--:--'}
            </span>
          </div>
        </div>

        <div className="today-actions">
          <button
            className="btn-checkin"
            onClick={handleCheckIn}
            disabled={isCheckedIn || checkingIn}
          >
            {checkingIn ? <><Hourglass size={18} /> Checking In...</> : <><LogIn size={18} /> Check In</>}
          </button>
          <button
            className="btn-checkout"
            onClick={handleCheckOut}
            disabled={!isCheckedIn || isCheckedOut || checkingOut}
          >
            {checkingOut ? <><Hourglass size={18} /> Checking Out...</> : <><LogOut size={18} /> Check Out</>}
          </button>
        </div>

        {message.text && (
          <div className={`attendance-message ${message.type}`}>
            {message.text}
          </div>
        )}
      </div>

      {/* ── Attendance History ── */}
      <div className="attendance-history-card">
        <div className="section-header">
          <h3>Attendance History</h3>
          <span className="count-badge">{records.length} records</span>
        </div>
        {!records.length ? (
          <div className="emp-empty-state">
            <div className="empty-icon" style={{ opacity: 0.5 }}><ClipboardList size={40} /></div>
            <div className="empty-text">No attendance records yet.</div>
          </div>
        ) : (
          <div className="emp-table-wrapper">
            <table className="emp-table">
              <thead>
                <tr>
                  <th>Date</th>
                  <th>Check In</th>
                  <th>Check Out</th>
                  <th>Hours</th>
                  <th>Status</th>
                </tr>
              </thead>
              <tbody>
                {records.map((rec) => (
                  <tr key={rec.id}>
                    <td>{rec.date ? new Date(rec.date).toLocaleDateString('en-US', { day: '2-digit', month: 'short', year: 'numeric' }) : '—'}</td>
                    <td>{formatTime(rec.check_in)}</td>
                    <td>{formatTime(rec.check_out)}</td>
                    <td>{calcHours(rec.check_in, rec.check_out)}</td>
                    <td>
                      <span className={`emp-status-badge ${getStatusClass(rec.status)}`}>
                        {rec.status}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  )
}

export default MyAttendance
