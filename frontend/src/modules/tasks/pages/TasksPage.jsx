import React, { useState, useEffect, useCallback, useRef } from 'react'
import { Plus, RotateCcw, LayoutGrid, BarChart3 } from 'lucide-react'
import Loader from '../../../components/ui/Loader'
import Button from '../../../components/ui/Button'
import TaskBoard from '../components/TaskBoard'
import { STATUS_LABELS } from '../components/TaskCard'
import TaskModal from '../components/TaskModal'
import ProofModal from '../components/ProofModal'
import TaskFilters from '../components/TaskFilters'
import TasksAnalyticsPage from './TasksAnalyticsPage'
import { taskApi } from '../services/taskApi'
import { useAuth } from '../../../context/AuthContext'
import { useTaskNotifications } from '../../../context/TaskNotificationContext'
import '../styles/TasksPage.css'
import '../styles/TasksAnalytics.css'

const DEFAULT_FILTERS = {
  status: '',
  priority: '',
  assignee_id: '',
  search: '',
}

const MAX_UNDO_STACK = 50

const TasksPage = () => {
  const { user } = useAuth()
  const { updateOverdueCount } = useTaskNotifications()
  const isAdmin = user?.is_admin

  const [tasks, setTasks] = useState([])
  const [employees, setEmployees] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [filters, setFilters] = useState(DEFAULT_FILTERS)
  const [modalOpen, setModalOpen] = useState(false)
  const [editingTask, setEditingTask] = useState(null)
  const [saving, setSaving] = useState(false)
  const [proofPending, setProofPending] = useState(null)
  // View toggle: 'board' | 'analytics'
  const [view, setView] = useState('board')
  // Undo stack — each entry: { taskId, prevStatus, prevProof, taskTitle }
  const [undoStack, setUndoStack] = useState([])
  const [undoAnimating, setUndoAnimating] = useState(false)
  const debounceRef = useRef(null)
  const handleUndoRef = useRef(null)

  const fetchTasks = useCallback(async (appliedFilters = {}) => {
    try {
      setLoading(true)
      setError(null)
      const params = {}
      if (appliedFilters.status) params.status = appliedFilters.status
      if (appliedFilters.priority) params.priority = appliedFilters.priority
      if (appliedFilters.assignee_id) params.assignee_id = Number(appliedFilters.assignee_id)
      if (appliedFilters.search) params.search = appliedFilters.search

      const res = await taskApi.getTasks(params)
      const fetchedTasks = res.data

      const overdueCount = fetchedTasks.filter(
        (t) => t.status === 'OVERDUE'
      ).length
      updateOverdueCount(overdueCount)

      setTasks(fetchedTasks)
    } catch (err) {
      console.error('Failed to fetch tasks:', err)
      setError('Failed to load tasks. Make sure the server is running.')
    } finally {
      setLoading(false)
    }
  }, [updateOverdueCount])

  const fetchEmployees = useCallback(async () => {
    try {
      const res = await taskApi.getEmployees()
      setEmployees(res.data || [])
    } catch {
      setEmployees([])
    }
  }, [])

  useEffect(() => {
    fetchTasks(filters)
    fetchEmployees()
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  // Keyboard shortcut: Ctrl+Z (undo)
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA' || e.target.tagName === 'SELECT') return

      if ((e.ctrlKey || e.metaKey) && e.key === 'z') {
        e.preventDefault()
        handleUndoRef.current()
      }
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [])

  // Debounced search
  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current)
    debounceRef.current = setTimeout(() => {
      fetchTasks(filters)
    }, 300)
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current)
    }
  }, [filters, fetchTasks])

  const handleFilterChange = (newFilters) => {
    setFilters(newFilters)
  }

  const handleClearFilters = () => {
    setFilters(DEFAULT_FILTERS)
  }

  const handleOpenCreate = () => {
    setEditingTask(null)
    setModalOpen(true)
  }

  const doStatusChange = useCallback(async (taskId, newStatus, proofUrl) => {
    let prevStatus = null
    let prevProof = null
    let taskTitle = ''

    // Optimistically update the UI and capture the previous state
    setTasks((prev) => {
      const task = prev.find((t) => t.id === taskId)
      if (task) {
        prevStatus = task.status
        prevProof = task.proof_attachment
        taskTitle = task.title
      }
      const updated = prev.map((t) =>
        t.id === taskId ? { ...t, status: newStatus, proof_attachment: proofUrl } : t
      )
      updateOverdueCount(updated.filter((t) => t.status === 'OVERDUE').length)
      return updated
    })

    if (prevStatus === null) return

    try {
      await taskApi.updateTask(taskId, { status: newStatus, proof_attachment: proofUrl })

      // Push to undo stack (only push if the status actually changed)
      if (prevStatus !== newStatus) {
        setUndoStack((prev) => {
          const entry = { taskId, prevStatus, prevProof, taskTitle }
          // Cap the stack
          const next = [entry, ...prev]
          return next.length > MAX_UNDO_STACK ? next.slice(0, MAX_UNDO_STACK) : next
        })
      }
    } catch (err) {
      console.error('Failed to update task status:', err)
      fetchTasks(filters)
    }
  }, [filters, fetchTasks, updateOverdueCount])

  const handleStatusChange = useCallback(async (taskId, newStatus) => {
    const task = tasks.find((t) => t.id === taskId)
    if (!task) return

    if (newStatus === 'COMPLETED') {
      setProofPending({ task, newStatus })
    } else {
      doStatusChange(taskId, newStatus, null)
    }
  }, [tasks, doStatusChange])

  const handleProofConfirm = useCallback((proofUrl) => {
    if (!proofPending) return
    const { task, newStatus } = proofPending
    setProofPending(null)
    doStatusChange(task.id, newStatus, proofUrl)
  }, [proofPending, doStatusChange])

  const handleProofCancel = useCallback(() => {
    setProofPending(null)
  }, [])

  const handleUndo = useCallback(async () => {
    setUndoStack((prev) => {
      if (prev.length === 0) return prev

      const [entry, ...rest] = prev
      const { taskId, prevStatus, prevProof, taskTitle } = entry

      setUndoAnimating(true)
      setTimeout(() => setUndoAnimating(false), 600)

      // Optimistically revert the UI
      setTasks((current) => {
        const updated = current.map((t) =>
          t.id === taskId ? { ...t, status: prevStatus, proof_attachment: prevProof } : t
        )
        updateOverdueCount(updated.filter((t) => t.status === 'OVERDUE').length)
        return updated
      })

      // Fire-and-forget API call
      taskApi.updateTask(taskId, { status: prevStatus, proof_attachment: prevProof })
        .catch((err) => {
          console.error('Failed to undo status change:', err)
          fetchTasks(filters)
        })

      return rest
    })
  }, [fetchTasks, updateOverdueCount])

  handleUndoRef.current = handleUndo

  const handleOpenEdit = (task) => {
    setEditingTask(task)
    setModalOpen(true)
  }

  const handleCloseModal = () => {
    setModalOpen(false)
    setEditingTask(null)
  }

  const handleSave = async (payload, taskId) => {
    try {
      let result = null
      if (taskId) {
        result = await taskApi.updateTask(taskId, payload)
      } else {
        result = await taskApi.createTask(payload)
      }
      await fetchTasks(filters)
      return result?.data || null
    } catch (err) {
      console.error('Failed to save task:', err)
      throw err
    }
  }

  const adminStats = isAdmin ? {
    total: tasks.length,
    todo: tasks.filter((t) => t.status === 'TODO').length,
    inProgress: tasks.filter((t) => t.status === 'ON_PROGRESS').length,
    completed: tasks.filter((t) => t.status === 'COMPLETED').length,
    overdue: tasks.filter((t) => t.status === 'OVERDUE').length,
  } : null

  const employeeStats = !isAdmin ? {
    total: tasks.length,
    todo: tasks.filter((t) => t.status === 'TODO').length,
    inProgress: tasks.filter((t) => t.status === 'ON_PROGRESS').length,
    completed: tasks.filter((t) => t.status === 'COMPLETED').length,
    overdue: tasks.filter((t) => t.status === 'OVERDUE').length,
  } : null

  const latestUndoEntry = undoStack[0]
  const canUndo = undoStack.length > 0

  return (
    <div className="tasks-page">
      <div className="tasks-header">
        <div>
          <h1>Tasks</h1>
          <p>{isAdmin ? 'Manage, assign, and track team tasks' : 'View and update your assigned tasks'}</p>
        </div>
        <div className="header-actions">
          {/* View Toggle Tabs */}
          <div className="tasks-view-tabs">
            <button
              className={`tasks-view-tab ${view === 'board' ? 'active' : ''}`}
              onClick={() => setView('board')}
            >
              <LayoutGrid size={16} />
              Board
            </button>
            <button
              className={`tasks-view-tab ${view === 'analytics' ? 'active' : ''}`}
              onClick={() => setView('analytics')}
            >
              <BarChart3 size={16} />
              Analytics
            </button>
          </div>
          {view === 'board' && (
            <div className={`undo-wrapper ${undoAnimating ? 'animating' : ''}`}>
              <button
                className="undo-btn"
                onClick={handleUndo}
                title={
                  canUndo
                    ? `Undo: Move "${latestUndoEntry.taskTitle}" back to ${STATUS_LABELS[latestUndoEntry.prevStatus] || latestUndoEntry.prevStatus} (Ctrl+Z)`
                    : 'Undo last status change (Ctrl+Z)'
                }
              >
                <RotateCcw size={15} />
                <span className="undo-btn-text">
                  {canUndo ? (
                    <>
                      Undo <strong>"{latestUndoEntry.taskTitle}"</strong>
                      <span className="undo-count">{undoStack.length}</span>
                    </>
                  ) : (
                    'Undo'
                  )}
                </span>
              </button>
            </div>
          )}
          {isAdmin && (
            <Button onClick={handleOpenCreate}>
              <Plus size={18} />
              New Task
            </Button>
          )}
        </div>
      </div>

      {view === 'board' ? (
        <>
          {/* Role-based quick stats */}
          <div className="tasks-dashboard-stats">
            {isAdmin && adminStats && (
              <>
                <div className="stat-card">
                  <span className="stat-value">{adminStats.total}</span>
                  <span className="stat-label">Total Tasks</span>
                </div>
                <div className="stat-card stat-todo">
                  <span className="stat-value">{adminStats.todo}</span>
                  <span className="stat-label">Pending</span>
                </div>
                <div className="stat-card stat-progress">
                  <span className="stat-value">{adminStats.inProgress}</span>
                  <span className="stat-label">In Progress</span>
                </div>
                <div className="stat-card stat-completed">
                  <span className="stat-value">{adminStats.completed}</span>
                  <span className="stat-label">Completed</span>
                </div>
                <div className="stat-card stat-overdue">
                  <span className="stat-value">{adminStats.overdue}</span>
                  <span className="stat-label">Overdue</span>
                </div>
              </>
            )}
            {!isAdmin && employeeStats && (
              <>
                <div className="stat-card">
                  <span className="stat-value">{employeeStats.total}</span>
                  <span className="stat-label">My Tasks</span>
                </div>
                <div className="stat-card stat-todo">
                  <span className="stat-value">{employeeStats.todo}</span>
                  <span className="stat-label">Pending</span>
                </div>
                <div className="stat-card stat-progress">
                  <span className="stat-value">{employeeStats.inProgress}</span>
                  <span className="stat-label">In Progress</span>
                </div>
                <div className="stat-card stat-completed">
                  <span className="stat-value">{employeeStats.completed}</span>
                  <span className="stat-label">Completed</span>
                </div>
                <div className="stat-card stat-overdue">
                  <span className="stat-value">{employeeStats.overdue}</span>
                  <span className="stat-label">Overdue</span>
                </div>
              </>
            )}
          </div>

          <TaskFilters
            filters={filters}
            onChange={handleFilterChange}
            employees={employees}
            onClear={handleClearFilters}
          />

          {loading && tasks.length === 0 ? (
            <div className="tasks-loading">
              <Loader size={32} />
              <span>Loading tasks...</span>
            </div>
          ) : error ? (
            <div className="tasks-error">{error}</div>
          ) : (
            <>
              <TaskBoard
                tasks={tasks}
                employees={employees}
                isAdmin={isAdmin}
                onTaskClick={handleOpenEdit}
                onStatusChange={handleStatusChange}
              />
              <div className="tasks-summary">
                <span className="summary-item">
                  <span className="summary-dot" style={{ background: 'var(--primary)' }} />
                  {tasks.length} {isAdmin ? 'total' : 'assigned'} tasks
                </span>
                <span className="summary-item">
                  <span className="summary-dot" style={{ background: '#ef4444' }} />
                  {tasks.filter((t) => t.status === 'OVERDUE').length} overdue
                </span>
                <span className="summary-item">
                  <span className="summary-dot" style={{ background: '#22c55e' }} />
                  {tasks.filter((t) => t.status === 'COMPLETED').length} completed
                </span>
              </div>
            </>
          )}
        </>
      ) : (
        <TasksAnalyticsPage />
      )}

      {modalOpen && (
        <TaskModal
          task={editingTask}
          employees={employees}
          onSave={handleSave}
          onClose={handleCloseModal}
        />
      )}

      {proofPending && (
        <ProofModal
          task={proofPending.task}
          newStatus={proofPending.newStatus}
          onConfirm={handleProofConfirm}
          onCancel={handleProofCancel}
        />
      )}
    </div>
  )
}

export default TasksPage
