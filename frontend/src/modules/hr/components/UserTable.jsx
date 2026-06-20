import React from 'react'
import { Pencil, Trash2 } from 'lucide-react'
import '../styles/HRPage.css'

const UserTable = ({ users = [], loading, onEdit, onDelete }) => {
  if (loading) {
    return (
      <div className="table-status">
        <div className="spinner" />
        <span>Loading users...</span>
      </div>
    )
  }

  if (!users.length) {
    return (
      <div className="table-status empty">
        <span>No users found. Create one to get started.</span>
      </div>
    )
  }

  return (
    <div className="table-wrapper">
      <table className="data-table">
        <thead>
          <tr>
            <th>ID</th>
            <th>Username</th>
            <th>Full Name</th>
            <th>Email</th>
            <th>Admin</th>
            <th>Actions</th>
          </tr>
        </thead>
        <tbody>
          {users.map((user) => (
            <tr key={user.id}>
              <td className="code-cell">{user.id}</td>
              <td className="name-cell">{user.username}</td>
              <td>{user.full_name || '—'}</td>
              <td>{user.email}</td>
              <td>
                <span className={`status-badge ${user.is_admin ? 'status-active' : 'status-inactive'}`}>
                  {user.is_admin ? 'Yes' : 'No'}
                </span>
              </td>
              <td className="actions-cell">
                <button
                  className="action-btn edit"
                  onClick={() => onEdit?.(user)}
                  title="Edit user"
                >
                  <Pencil size={16} />
                </button>
                <button
                  className="action-btn delete"
                  onClick={() => onDelete?.(user)}
                  title="Delete user"
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

export default UserTable
