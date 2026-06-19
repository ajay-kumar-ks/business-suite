import React from 'react'
import { CheckCircle, XCircle } from 'lucide-react'
import { hrAPI } from '../services/hrApi'
import '../styles/HRPage.css'

const STATUS_COLORS = {
  'Pending': '#f59e0b',
  'Approved': '#22c55e',
  'Rejected': '#ef4444',
}

const LeaveTable = ({ leaves = [], loading, onRefresh }) => {
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
      {!leaves.length ? (
        <div className="table-status empty">
          <span>No leave requests yet.</span>
        </div>
      ) : (
        <div>
          <div className="inline-table-header">
            <span className="count-badge">{leaves.length} requests</span>
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
                            <CheckCircle size={16} />
                          </button>
                          <button
                            className="action-btn reject"
                            onClick={() => handleApproveReject(lv.id, 'Rejected')}
                            title="Reject"
                          >
                            <XCircle size={16} />
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
