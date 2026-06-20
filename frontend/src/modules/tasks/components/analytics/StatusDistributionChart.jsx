import React from 'react'
import { Doughnut } from 'react-chartjs-2'
import { ArcElement, Tooltip, Legend } from 'chart.js'
import { Chart as ChartJS } from 'chart.js'
import { PieChart } from 'lucide-react'

ChartJS.register(ArcElement, Tooltip, Legend)

const STATUS_COLORS = {
  TODO: { bg: 'rgba(107, 114, 128, 0.7)', border: '#6b7280' },
  ON_PROGRESS: { bg: 'rgba(59, 130, 246, 0.7)', border: '#3b82f6' },
  ON_HOLD: { bg: 'rgba(245, 158, 11, 0.7)', border: '#f59e0b' },
  ON_REVIEW: { bg: 'rgba(139, 92, 246, 0.7)', border: '#8b5cf6' },
  COMPLETED: { bg: 'rgba(34, 197, 94, 0.7)', border: '#22c55e' },
  OVERDUE: { bg: 'rgba(239, 68, 68, 0.7)', border: '#ef4444' },
}

const STATUS_LABELS = {
  TODO: 'Todo',
  ON_PROGRESS: 'In Progress',
  ON_HOLD: 'On Hold',
  ON_REVIEW: 'On Review',
  COMPLETED: 'Completed',
  OVERDUE: 'Overdue',
}

const StatusDistributionChart = ({ data, loading }) => {
  if (loading) {
    return <div className="chart-skeleton" style={{ height: 280, borderRadius: '50%', width: 280, margin: '0 auto' }} />
  }

  if (!data) {
    return (
      <div className="chart-empty">
        <PieChart size={32} />
        <span>No status data available</span>
      </div>
    )
  }

  const entries = Object.entries(data).filter(([_, count]) => count > 0)

  if (entries.length === 0) {
    return (
      <div className="chart-empty">
        <PieChart size={32} />
        <span>No tasks to show distribution</span>
      </div>
    )
  }

  const chartData = {
    labels: entries.map(([key]) => STATUS_LABELS[key] || key),
    datasets: [
      {
        data: entries.map(([_, count]) => count),
        backgroundColor: entries.map(([key]) => STATUS_COLORS[key]?.bg || 'rgba(156, 163, 175, 0.7)'),
        borderColor: entries.map(([key]) => STATUS_COLORS[key]?.border || '#9ca3af'),
        borderWidth: 2,
        hoverOffset: 8,
      },
    ],
  }

  const options = {
    responsive: true,
    maintainAspectRatio: false,
    cutout: '65%',
    plugins: {
      legend: {
        position: 'bottom',
        labels: {
          usePointStyle: true,
          boxWidth: 8,
          padding: 12,
          font: { size: 11 },
        },
      },
      tooltip: {
        backgroundColor: 'var(--sidebar)',
        titleColor: 'var(--text)',
        bodyColor: 'var(--text)',
        borderColor: 'var(--border)',
        borderWidth: 1,
        padding: 12,
        cornerRadius: 8,
        callbacks: {
          label: (context) => {
            const total = context.dataset.data.reduce((a, b) => a + b, 0)
            const value = context.parsed
            const pct = total > 0 ? ((value / total) * 100).toFixed(1) : 0
            return ` ${context.label}: ${value} (${pct}%)`
          },
        },
      },
    },
  }

  return (
    <div className="chart-container">
      <div className="chart-header">
        <div className="chart-title">
          <PieChart size={16} />
          <span>Status Distribution</span>
        </div>
      </div>
      <div className="chart-body chart-body-center">
        <Doughnut data={chartData} options={options} />
      </div>
    </div>
  )
}

export default StatusDistributionChart
