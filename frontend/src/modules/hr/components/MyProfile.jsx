import React, { useState, useEffect } from 'react'
import Loader from '../../../components/ui/Loader'
import { hrAPI } from '../services/hrApi'
import '../styles/HRPage.css'
import '../styles/EmployeeDashboard.css'

const MyProfile = () => {
  const [profile, setProfile] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    const fetchProfile = async () => {
      try {
        const res = await hrAPI.getMyProfile()
        setProfile(res.data)
      } catch (err) {
        setError(err.response?.data?.detail || 'Failed to load profile')
      } finally {
        setLoading(false)
      }
    }
    fetchProfile()
  }, [])

  if (loading) {
    return (
      <div className="emp-loader-wrapper">
        <Loader fullScreen={false} size={30} />
      </div>
    )
  }

  if (error) {
    return <div className="emp-empty-state"><span className="empty-text">{error}</span></div>
  }

  if (!profile) {
    return <div className="emp-empty-state"><span className="empty-text">No profile data found.</span></div>
  }

  const { user, employee } = profile
  const initials = (user.full_name || user.username).charAt(0).toUpperCase()

  const formatDate = (dateStr) => {
    if (!dateStr) return '—'
    return new Date(dateStr).toLocaleDateString('en-US', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
    })
  }

  const fields = [
    { label: 'Employee Code', value: employee?.employee_code },
    { label: 'Email', value: user.email },
    { label: 'Phone', value: employee?.phone },
    { label: 'Joining Date', value: formatDate(employee?.joining_date) },
    { label: 'Username', value: user.username },
    { label: 'Department', value: employee?.department_name },
    {
      label: 'Status',
      value: employee?.status ? (
        <span
          className="profile-status-badge"
          style={{
            background: employee.status === 'Active' ? '#22c55e' : '#9ca3af',
          }}
        >
          {employee.status}
        </span>
      ) : '—',
    },
  ]

  return (
    <div className="emp-dashboard">
      {/* ── Profile Header Card ── */}
      <div className="profile-header-card">
        <div className="profile-avatar-circle">
          {initials}
        </div>
        <div className="profile-header-info">
          <h2>{user.full_name || user.username}</h2>
          <div className="profile-header-dept">{employee?.department_name || 'Employee'}</div>
        </div>
      </div>

      {/* ── Details Grid ── */}
      <div className="profile-details-card">
        <div className="profile-details-grid">
          {fields.map((field, i) => (
            <div key={i} className="profile-detail-row">
              <span className="profile-detail-label">{field.label}</span>
              <span className="profile-detail-value">{field.value || '—'}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

export default MyProfile
