import React, { useState, useCallback } from 'react'
import { Calendar } from 'lucide-react'
import Avatar from '../../../components/ui/Avatar'

const PRIORITY_LABELS = {
  LOW: 'Low',
  MEDIUM: 'Medium',
  HIGH: 'High',
  URGENT: 'Urgent',
}

const STATUS_LABELS = {
  TODO: 'Todo',
  ON_PROGRESS: 'On Progress',
  ON_HOLD: 'On Hold',
  ON_REVIEW: 'On Review',
  COMPLETED: 'Completed',
  OVERDUE: 'Overdue',
}

const STATUS_OPTIONS = [
  { value: 'TODO', label: 'Todo' },
  { value: 'ON_PROGRESS', label: 'On Progress' },
  { value: 'ON_HOLD', label: 'On Hold' },
  { value: 'ON_REVIEW', label: 'On Review' },
  { value: 'COMPLETED', label: 'Completed' },
  { value: 'OVERDUE', label: 'Overdue' },
]

const TaskCard = ({ task, employees = [], onClick, onStatusChange }) => {
  const [isDragging, setIsDragging] = useState(false)
  const [changingStatus, setChangingStatus] = useState(false)

  const isOverdue =
    task.status !== 'COMPLETED' &&
    task.status !== 'OVERDUE' &&
    new Date(task.due_date) < new Date()

  const assignee = employees.find((e) => e.id === task.assignee_id)

  const formatDate = (dateStr) => {
    const d = new Date(dateStr)
    return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
  }

  const handleDragStart = useCallback((e) => {
    setIsDragging(true)
    e.dataTransfer.setData('text/plain', task.id)
    e.dataTransfer.effectAllowed = 'move'
  }, [task.id])

  const handleDragEnd = useCallback(() => {
    setIsDragging(false)
  }, [])

  const handleStatusChange = useCallback(async (e) => {
    const newStatus = e.target.value
    if (newStatus === task.status) return

    setChangingStatus(true)
    try {
      await onStatusChange?.(task.id, newStatus)
    } finally {
      setChangingStatus(false)
    }
  }, [task.id, task.status, onStatusChange])

  const statusClass = `status-${task.status.toLowerCase()}`

  return (
    <div
      className={`task-card ${isDragging ? 'dragging' : ''}`}
      draggable
      onDragStart={handleDragStart}
      onDragEnd={handleDragEnd}
      onClick={() => onClick?.(task)}
      role="button"
      tabIndex={0}
    >
      <div className="task-card-title">{task.title}</div>

      <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', alignItems: 'center' }}>
        <span className={`priority-badge priority-${task.priority.toLowerCase()}`}>
          {PRIORITY_LABELS[task.priority]}
        </span>

        <div className="task-card-status-select" onClick={(e) => e.stopPropagation()}>
          <select
            value={task.status}
            onChange={handleStatusChange}
            disabled={changingStatus}
            className={`status-badge ${statusClass}`}
          >
            {STATUS_OPTIONS.map((opt) => (
              <option key={opt.value} value={opt.value}>{opt.label}</option>
            ))}
          </select>
        </div>
      </div>

      <div className="task-card-meta">
        {assignee && (
          <div className="task-card-assignee">
            <Avatar name={assignee.name || assignee.username} size={22} />
            <span>{assignee.name || assignee.username}</span>
          </div>
        )}

        <div className={`task-card-due ${isOverdue ? 'overdue' : ''}`}>
          <Calendar size={12} style={{ marginRight: 4, display: 'inline', verticalAlign: 'middle' }} />
          {formatDate(task.due_date)}
        </div>
      </div>

      {task.reason_note && (
        <div className="task-card-reason">{task.reason_note}</div>
      )}
    </div>
  )
}

export default TaskCard
export { PRIORITY_LABELS, STATUS_LABELS }
