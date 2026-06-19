import React from 'react'
import '../styles/HRPage.css'

const STATUS_COLORS = {
  'Present': '#22c55e',
  'Absent': '#ef4444',
  'Half Day': '#f59e0b',
  'Leave': '#3b82f6',
}

const AttendanceTable = ({
  attendanceRecords = [],
  loading,
}) => {
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
      {!attendanceRecords.length ? (
        <div className="table-status empty">
          <span>No attendance records yet.</span>
        </div>
      ) : (
        <div>
          <div className="inline-table-header">
            <span className="count-badge">{attendanceRecords.length} records</span>
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
