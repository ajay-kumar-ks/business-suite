import React, { useState, useCallback } from 'react'
import { Inbox, AlertCircle } from 'lucide-react'
import TaskCard from './TaskCard'

const COLUMNS = [
  { key: 'TODO', label: 'Todo', icon: Inbox },
  { key: 'ON_PROGRESS', label: 'On Progress', icon: null },
  { key: 'ON_HOLD', label: 'On Hold', icon: null },
  { key: 'ON_REVIEW', label: 'On Review', icon: null },
  { key: 'COMPLETED', label: 'Completed', icon: null },
  { key: 'OVERDUE', label: 'Overdue', icon: AlertCircle },
]

const TaskBoard = ({ tasks, employees, onTaskClick, onStatusChange }) => {
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
    // Only clear if actually leaving this column (not entering a child)
    if (!e.currentTarget.contains(e.relatedTarget)) {
      setDragOverColumn((prev) => prev === colKey ? null : prev)
    }
  }, [])

  const handleDrop = useCallback((e, colKey) => {
    e.preventDefault()
    setDragOverColumn(null)
    const taskId = e.dataTransfer.getData('text/plain')
    if (taskId && onStatusChange) {
      onStatusChange(taskId, colKey)
    }
  }, [onStatusChange])

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
