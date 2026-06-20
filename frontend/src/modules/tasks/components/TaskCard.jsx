import React, { useState, useCallback, useMemo } from 'react'
import { Calendar, Paperclip, Building2, Briefcase, ListChecks } from 'lucide-react'
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

// Status progression order (higher = later in workflow)
const STATUS_ORDER = {
  TODO: 0,
  ON_PROGRESS: 1,
  ON_HOLD: 2,
  ON_REVIEW: 3,
  COMPLETED: 4,
  OVERDUE: 5,
}

const ALL_STATUS_OPTIONS = [
  { value: 'TODO', label: 'Todo' },
  { value: 'ON_PROGRESS', label: 'On Progress' },
  { value: 'ON_HOLD', label: 'On Hold' },
  { value: 'ON_REVIEW', label: 'On Review' },
  { value: 'COMPLETED', label: 'Completed' },
  { value: 'OVERDUE', label: 'Overdue' },
]

const TaskCard = ({ task, employees = [], onClick, onStatusChange, isAdmin }) => {
  const [isDragging, setIsDragging] = useState(false)
  const [changingStatus, setChangingStatus] = useState(false)

  // Resolve assignee from the enriched employee data
  const assignee = task.assignee_name
    ? {
        id: task.assignee_id,
        name: task.assignee_name,
        email: task.assignee_email,
        department: task.assignee_department,
        designation: task.assignee_designation,
      }
    : employees.find((e) => e.id === task.assignee_id)

  // Determine which statuses are available in the dropdown
  // OVERDUE is excluded — it can only be set automatically by the overdue scheduler
  const forwardStatusOptions = useMemo(() => {
    const currentOrder = STATUS_ORDER[task.status] ?? -1
    return ALL_STATUS_OPTIONS.filter((opt) => {
      // Never allow manually setting to OVERDUE (auto-assigned only by scheduler)
      if (opt.value === 'OVERDUE') return false

      const optOrder = STATUS_ORDER[opt.value] ?? -1

      // COMPLETED can only be reached from ON_REVIEW
      if (opt.value === 'COMPLETED' && task.status !== 'ON_REVIEW') return false

      // Forward transitions are always allowed
      if (optOrder > currentOrder) return true

      // Special backward transitions:
      //   OVERDUE → ON_REVIEW    (overdue task completed, send for review)
      //   ON_HOLD → ON_PROGRESS  (resume a held task)
      //   ON_REVIEW → TODO       (admin rejects review, sends back to todo)
      //   COMPLETED → ON_REVIEW  (admin reopens completed task for review)
      if (
        (task.status === 'OVERDUE' && opt.value === 'ON_REVIEW') ||
        (task.status === 'ON_HOLD' && opt.value === 'ON_PROGRESS') ||
        (task.status === 'ON_REVIEW' && opt.value === 'TODO' && isAdmin) ||
        (task.status === 'COMPLETED' && opt.value === 'ON_REVIEW' && isAdmin)
      ) {
        return true
      }

      return false
    })
  }, [task.status, isAdmin])

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
  const isOverdue =
    task.status !== 'COMPLETED' &&
    task.status !== 'OVERDUE' &&
    new Date(task.due_date) < new Date()

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
      {task.status === 'ON_PROGRESS' && <div className="task-card-progress-bar" />}

      <div className="task-card-title">{task.title}</div>

      {/* Checklist progress bar */}
      {task.subtask_count > 0 && (
        <div className="task-card-checklist-bar">
          <div className="task-card-checklist-bar-track">
            <div
              className="task-card-checklist-bar-fill"
              style={{ width: `${Math.round((task.subtask_completed_count / task.subtask_count) * 100)}%` }}
            />
          </div>
          <span className="task-card-checklist-label">
            <ListChecks size={10} />
            {task.subtask_completed_count}/{task.subtask_count}
          </span>
        </div>
      )}

      <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', alignItems: 'center' }}>
        <span className={`priority-badge priority-${task.priority.toLowerCase()}`}>
          {PRIORITY_LABELS[task.priority]}
        </span>

        <div className="task-card-status-select" onClick={(e) => e.stopPropagation()}>
          <select
            value={task.status}
            onChange={handleStatusChange}
            disabled={changingStatus || task.status === 'COMPLETED'}
            className={`status-badge ${statusClass}`}
          >
            <option value={task.status}>{STATUS_LABELS[task.status]}</option>
            {forwardStatusOptions.map((opt) => (
              <option key={opt.value} value={opt.value}>{opt.label}</option>
            ))}
          </select>
        </div>
      </div>

      <div className="task-card-meta">
        {assignee && (
          <div className="task-card-assignee" title={assignee.email || ''}>
            <Avatar name={assignee.name} size={22} />
            <span>{assignee.name}</span>
            {assignee.department && (
              <span className="task-card-dept" title={assignee.department}>
                <Building2 size={10} />
                {assignee.department}
              </span>
            )}
            {assignee.designation && (
              <span className="task-card-dept" title={assignee.designation}>
                <Briefcase size={10} />
                {assignee.designation}
              </span>
            )}
          </div>
        )}

        <div className={`task-card-due ${isOverdue ? 'overdue' : ''}`}>
          <Calendar size={12} style={{ marginRight: 4, display: 'inline', verticalAlign: 'middle' }} />
          {formatDate(task.due_date)}
        </div>
      </div>

      {task.proof_attachment && task.status === 'COMPLETED' && (
        <div className="task-card-reason" style={{ display: 'flex', alignItems: 'center', gap: 4, color: 'var(--primary)' }}>
          <Paperclip size={12} />
          <span style={{ fontSize: 11 }}>Proof attached</span>
        </div>
      )}

      {task.reason_note && (
        <div className="task-card-reason">{task.reason_note}</div>
      )}

    </div>
  )
}

export default TaskCard
export { PRIORITY_LABELS, STATUS_LABELS }
