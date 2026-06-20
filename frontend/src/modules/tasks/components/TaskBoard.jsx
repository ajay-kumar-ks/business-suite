import React, { useState, useCallback } from 'react'
import { Inbox, AlertCircle } from 'lucide-react'
import TaskCard from './TaskCard'

// Status progression order (higher = later in workflow)
const STATUS_ORDER = {
  TODO: 0,
  ON_PROGRESS: 1,
  ON_HOLD: 2,
  ON_REVIEW: 3,
  COMPLETED: 4,
  OVERDUE: 5,
}

const COLUMNS = [
  { key: 'TODO', label: 'Todo', icon: Inbox },
  { key: 'ON_PROGRESS', label: 'On Progress', icon: null },
  { key: 'ON_HOLD', label: 'On Hold', icon: null },
  { key: 'ON_REVIEW', label: 'On Review', icon: null },
  { key: 'COMPLETED', label: 'Completed', icon: null },
  { key: 'OVERDUE', label: 'Overdue', icon: AlertCircle },
]

const TaskBoard = ({ tasks, employees, onTaskClick, onStatusChange, isAdmin }) => {
  const [dragOverColumn, setDragOverColumn] = useState(null)

  const handleDragOver = useCallback((e, colKey) => {
    e.preventDefault()
    e.dataTransfer.dropEffect = 'move'
    setDragOverColumn(colKey)
  }, [])

  const handleDragEnter = useCallback((e, colKey) => {
    e.preventDefault()
    setDragOverColumn(colKey)
  }, [])

  const handleDragLeave = useCallback((e, colKey) => {
    if (!e.currentTarget.contains(e.relatedTarget)) {
      setDragOverColumn((prev) => prev === colKey ? null : prev)
    }
  }, [])

  const handleDrop = useCallback((e, colKey) => {
    e.preventDefault()
    setDragOverColumn(null)
    const taskId = e.dataTransfer.getData('text/plain')
    if (!taskId || !onStatusChange) return

    const task = (tasks || []).find((t) => t.id === taskId)
    if (!task || task.status === colKey) return

    // Special backward transitions:
    //   OVERDUE  → ON_REVIEW    (overdue task completed, send for review)
    //   ON_HOLD  → ON_PROGRESS  (resume a held task)
    //   ON_REVIEW → TODO        (admin rejects review, sends back to todo)
    //   COMPLETED → ON_REVIEW   (admin reopens completed task for review)
    const isAllowedBackward =
      (task.status === 'OVERDUE' && colKey === 'ON_REVIEW') ||
      (task.status === 'ON_HOLD' && colKey === 'ON_PROGRESS') ||
      (task.status === 'ON_REVIEW' && colKey === 'TODO' && isAdmin) ||
      (task.status === 'COMPLETED' && colKey === 'ON_REVIEW' && isAdmin)

    // COMPLETED can only be reached from ON_REVIEW
    if (colKey === 'COMPLETED' && task.status !== 'ON_REVIEW') return

    // Prevent backward movement (unless it's a special allowed case)
    const currentOrder = STATUS_ORDER[task.status] ?? -1
    const targetOrder = STATUS_ORDER[colKey] ?? -1
    if (targetOrder <= currentOrder && !isAllowedBackward) return

    // Prevent dropping onto OVERDUE (auto-assigned only)
    if (colKey === 'OVERDUE') return

    onStatusChange(taskId, colKey)
  }, [onStatusChange, tasks])

  const grouped = {}
  COLUMNS.forEach((col) => {
    grouped[col.key] = (tasks || []).filter((t) => t.status === col.key)
  })

  return (
    <div className="task-board">
      {COLUMNS.map((col) => {
        const columnTasks = grouped[col.key] || []
        const Icon = col.icon
        const isDragOver = dragOverColumn === col.key

        return (
          <div
            className={`task-column ${isDragOver ? 'drag-over' : ''}`}
            key={col.key}
          >
            <div className="task-column-header">
              <span style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                {Icon && <Icon size={16} />}
                {col.label}
              </span>
              <span className="task-column-count">{columnTasks.length}</span>
            </div>

            <div
              className="task-column-body"
              onDragOver={(e) => handleDragOver(e, col.key)}
              onDragEnter={(e) => handleDragEnter(e, col.key)}
              onDragLeave={(e) => handleDragLeave(e, col.key)}
              onDrop={(e) => handleDrop(e, col.key)}
            >
              {columnTasks.length === 0 ? (
                <div className="task-column-empty">
                  <Inbox size={24} />
                  <span>No tasks</span>
                </div>
              ) : (
                columnTasks.map((task) => (
                  <TaskCard
                    key={task.id}
                    task={task}
                    employees={employees}
                    isAdmin={isAdmin}
                    onClick={onTaskClick}
                    onStatusChange={onStatusChange}
                  />
                ))
              )}
            </div>
          </div>
        )
      })}
    </div>
  )
}

export default TaskBoard
