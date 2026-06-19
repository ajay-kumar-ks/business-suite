import React from 'react'
import '../styles/HRPage.css'

const UserTable = ({ users = [], loading, onRefresh }) => {
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
          </tr>
        </thead>
        <tbody>
          {users.map((user) => (
            <tr key={user.id}>
              <td className="code-cell">{user.id}</td>
              <td className="name-cell">{user.username}</td>
              <td>{user.full_name || '—'}</td>
              <td>{user.email}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

export default UserTable
