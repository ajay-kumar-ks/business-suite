import React from 'react'
import {
  ListTodo,
  CheckCircle2,
  Clock,
  AlertTriangle,
  TrendingUp,
  Calendar,
  BarChart3,
} from 'lucide-react'

const STATUS_ICONS = {
  total: { icon: ListTodo, color: 'var(--primary)' },
  completed: { icon: CheckCircle2, color: '#22c55e' },
  pending: { icon: Clock, color: '#6b7280' },
  overdue: { icon: AlertTriangle, color: '#ef4444' },
  inProgress: { icon: TrendingUp, color: '#3b82f6' },
  completionRate: { icon: BarChart3, color: '#8b5cf6' },
  today: { icon: Calendar, color: '#f59e0b' },
}

const LABEL_MAP = {
  total_tasks: 'Total Tasks',
  completed_tasks: 'Completed',
  pending_tasks: 'Pending',
  overdue_tasks: 'Overdue',
  in_progress_tasks: 'In Progress',
  on_hold_tasks: 'On Hold',
  on_review_tasks: 'On Review',
  completion_rate: 'Completion Rate',
  avg_completion_time_hours: 'Avg Completion Time',
  tasks_created_today: 'Created Today',
  tasks_completed_today: 'Completed Today',
  tasks_overdue_total: 'Overdue Total',
}

const FORMAT_MAP = {
  completion_rate: (v) => `${v}%`,
  avg_completion_time_hours: (v) => `${v}h`,
}

const PerformanceSummary = ({ summary, loading }) => {
  if (loading) {
    return (
      <div className="analytics-summary">
        {[1, 2, 3, 4, 5, 6, 7].map((i) => (
          <div key={i} className="stat-card-skeleton" />
        ))}
      </div>
    )
  }

  if (!summary) return null

  const cards = [
    { key: 'total_tasks', value: summary.total_tasks },
    { key: 'completed_tasks', value: summary.completed_tasks },
    { key: 'pending_tasks', value: summary.pending_tasks },
    { key: 'in_progress_tasks', value: summary.in_progress_tasks },
    { key: 'overdue_tasks', value: summary.overdue_tasks },
    { key: 'completion_rate', value: summary.completion_rate },
    { key: 'tasks_created_today', value: summary.tasks_created_today },
  ]

  return (
    <div className="analytics-summary">
      {cards.map(({ key, value }) => {
        const meta = STATUS_ICONS[
          key === 'total_tasks' ? 'total' :
          key === 'completed_tasks' ? 'completed' :
          key === 'pending_tasks' ? 'pending' :
          key === 'overdue_tasks' ? 'overdue' :
          key === 'in_progress_tasks' ? 'inProgress' :
          key === 'completion_rate' ? 'completionRate' :
          key === 'tasks_created_today' ? 'today' : 'total'
        ]
        const Icon = meta?.icon || ListTodo
        const formatter = FORMAT_MAP[key]
        const displayValue = formatter ? formatter(value) : value

        return (
          <div className="analytics-stat-card" key={key}>
            <div className="analytics-stat-icon" style={{ background: `${meta?.color}15`, color: meta?.color }}>
              <Icon size={20} />
            </div>
            <div className="analytics-stat-info">
              <span className="analytics-stat-value">{displayValue}</span>
              <span className="analytics-stat-label">{LABEL_MAP[key]}</span>
            </div>
          </div>
        )
      })}
    </div>
  )
}

export default PerformanceSummary
