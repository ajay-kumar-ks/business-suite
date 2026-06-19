import React from 'react'
import { Eye, Pencil, Trash2 } from 'lucide-react'
import '../styles/HRPage.css'

const STATUS_COLORS = {
  Active: '#22c55e',
  Inactive: '#9ca3af',
  Resigned: '#ef4444',
}

const EmployeeTable = ({ employees = [], loading, onEdit, onDelete, onView }) => {
  if (loading) {
    return (
      <div className="table-status">
        <div className="spinner" />
        <span>Loading employees...</span>
      </div>
    )
  }

  if (!employees.length) {
    return (
      <div className="table-status empty">
        <span>No employees found.</span>
      </div>
    )
  }

  return (
    <div className="table-wrapper">
      <table className="data-table">
        <thead>
          <tr>
            <th>Employee Code</th>
            <th>Name</th>
            <th>Department</th>
            <th>Role</th>
            <th>Phone</th>
            <th>Status</th>
            <th>Actions</th>
          </tr>
        </thead>
        <tbody>
          {employees.map((emp) => (
            <tr key={emp.id}>
              <td className="code-cell">{emp.employee_code}</td>
              <td className="name-cell">{emp.user_name || `User #${emp.user_id}`}</td>
              <td>{emp.department_name || '—'}</td>
              <td>{emp.role_name || '—'}</td>
              <td>{emp.phone || '—'}</td>
              <td>
                <span
                  className="status-badge"
                  style={{ backgroundColor: STATUS_COLORS[emp.status] || '#6b7280' }}
                >
                  {emp.status}
                </span>
              </td>
              <td className="actions-cell">
                <button
                  className="action-btn view"
                  onClick={() => onView?.(emp)}
                  title="View details"
                >
                  <Eye size={16} />
                </button>
                <button
                  className="action-btn edit"
                  onClick={() => onEdit?.(emp)}
                  title="Edit employee"
                >
                  <Pencil size={16} />
                </button>
                <button
                  className="action-btn delete"
                  onClick={() => onDelete?.(emp)}
                  title="Delete employee"
                >
                  <Trash2 size={16} />
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

export default EmployeeTable
