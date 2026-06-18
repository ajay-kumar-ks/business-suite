import React, { useState, useEffect, useCallback, useRef } from 'react'
import { Plus, Loader } from 'lucide-react'
import Button from '../../../components/ui/Button'
import TaskBoard from '../components/TaskBoard'
import TaskModal from '../components/TaskModal'
import TaskFilters from '../components/TaskFilters'
import { taskApi } from '../services/taskApi'
import { useAuth } from '../../../context/AuthContext'
import { useTaskNotifications } from '../../../context/TaskNotificationContext'
import '../styles/TasksPage.css'

const DEFAULT_FILTERS = {
  status: '',
  priority: '',
  assignee_id: '',
  search: '',
}

const TasksPage = () => {
  const { user } = useAuth()
  const { updateOverdueCount } = useTaskNotifications()

  const [tasks, setTasks] = useState([])
  const [employees, setEmployees] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [filters, setFilters] = useState(DEFAULT_FILTERS)
  const [modalOpen, setModalOpen] = useState(false)
  const [editingTask, setEditingTask] = useState(null)
  const [saving, setSaving] = useState(false)
  const debounceRef = useRef(null)

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

      // Update overdue notification count
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
      // Employees endpoint may not have data yet
      setEmployees([])
    }
  }, [])

  useEffect(() => {
    fetchTasks(filters)
    fetchEmployees()
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  // Debounced search
  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current)
    debounceRef.current = setTimeout(() => {
      fetchTasks(filters)
    }, 300)
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current)
    }
  }, [filters]) // eslint-disable-line react-hooks/exhaustive-deps

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

  const handleStatusChange = useCallback(async (taskId, newStatus) => {
    // Optimistically update the UI — avoids flicker from a full re-fetch
    setTasks((prev) => {
      const updated = prev.map((t) =>
        t.id === taskId ? { ...t, status: newStatus } : t
      )
      // Update overdue notification count from the optimistic state
      updateOverdueCount(updated.filter((t) => t.status === 'OVERDUE').length)
      return updated
    })

    try {
      await taskApi.updateTask(taskId, { status: newStatus })
    } catch (err) {
      console.error('Failed to update task status:', err)
      // Revert by re-fetching
      fetchTasks(filters)
    }
  }, [filters, fetchTasks, updateOverdueCount])

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
      if (taskId) {
        await taskApi.updateTask(taskId, payload)
      } else {
        await taskApi.createTask(payload)
      }
      handleCloseModal()
      await fetchTasks(filters)
    } catch (err) {
      console.error('Failed to save task:', err)
      throw err
    }
  }

  return (
    <div className="tasks-page">
      <div className="tasks-header">
        <div>
          <h1>Tasks</h1>
          <p>Manage, assign, and track team tasks</p>
        </div>
        {user?.is_admin && (
          <Button onClick={handleOpenCreate}>
            <Plus size={18} />
            New Task
          </Button>
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
            onTaskClick={handleOpenEdit}
            onStatusChange={handleStatusChange}
          />
          <div className="tasks-summary">
            <span className="summary-item">
              <span className="summary-dot" style={{ background: 'var(--primary)' }} />
              {tasks.length} total tasks
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

      {modalOpen && (
        <TaskModal
          task={editingTask}
          employees={employees}
          onSave={handleSave}
          onClose={handleCloseModal}
        />
      )}
    </div>
  )
}

export default TasksPage
