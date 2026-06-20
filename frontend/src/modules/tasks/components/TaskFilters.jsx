import React from 'react'
import { useAuth } from '../../../context/AuthContext'

const STATUS_OPTIONS = [
  { value: '', label: 'All Statuses' },
  { value: 'TODO', label: 'Todo' },
  { value: 'ON_PROGRESS', label: 'On Progress' },
  { value: 'ON_HOLD', label: 'On Hold' },
  { value: 'ON_REVIEW', label: 'On Review' },
  { value: 'COMPLETED', label: 'Completed' },
  { value: 'OVERDUE', label: 'Overdue' },
]

const PRIORITY_OPTIONS = [
  { value: '', label: 'All Priorities' },
  { value: 'LOW', label: 'Low' },
  { value: 'MEDIUM', label: 'Medium' },
  { value: 'HIGH', label: 'High' },
  { value: 'URGENT', label: 'Urgent' },
]

const TaskFilters = ({ filters, onChange, employees, onClear }) => {
  const { user } = useAuth()
  const isAdmin = user?.is_admin

  return (
    <div className="tasks-filters">
      <div className="filter-group">
        <label htmlFor="filter-search">Search</label>
        <input
          id="filter-search"
          type="text"
          placeholder="Search by title..."
          value={filters.search || ''}
          onChange={(e) => onChange({ ...filters, search: e.target.value })}
        />
      </div>

      <div className="filter-group">
        <label htmlFor="filter-status">Status</label>
        <select
          id="filter-status"
          value={filters.status || ''}
          onChange={(e) => onChange({ ...filters, status: e.target.value })}
        >
          {STATUS_OPTIONS.map((opt) => (
            <option key={opt.value} value={opt.value}>{opt.label}</option>
          ))}
        </select>
      </div>

      <div className="filter-group">
        <label htmlFor="filter-priority">Priority</label>
        <select
          id="filter-priority"
          value={filters.priority || ''}
          onChange={(e) => onChange({ ...filters, priority: e.target.value })}
        >
          {PRIORITY_OPTIONS.map((opt) => (
            <option key={opt.value} value={opt.value}>{opt.label}</option>
          ))}
        </select>
      </div>

      {/* Assignee filter — admin only */}
      {isAdmin && (
        <div className="filter-group">
          <label htmlFor="filter-assignee">Assignee</label>
          <select
            id="filter-assignee"
            value={filters.assignee_id || ''}
            onChange={(e) => onChange({ ...filters, assignee_id: e.target.value })}
          >
            <option value="">All Assignees</option>
            {employees.map((emp) => (
              <option key={emp.id} value={emp.id}>
                {emp.name || emp.email || emp.username}
              </option>
            ))}
          </select>
        </div>
      )}

      <button className="filter-clear" onClick={onClear} type="button">
        Clear Filters
      </button>
    </div>
  )
}

export default TaskFilters
