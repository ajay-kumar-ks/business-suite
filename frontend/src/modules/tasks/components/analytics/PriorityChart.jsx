import React from 'react'
import { Pie } from 'react-chartjs-2'
import { ArcElement, Tooltip, Legend } from 'chart.js'
import { Chart as ChartJS } from 'chart.js'
import { BarChart3 } from 'lucide-react'

ChartJS.register(ArcElement, Tooltip, Legend)

const PRIORITY_COLORS = {
  LOW: { bg: 'rgba(34, 197, 94, 0.7)', border: '#22c55e' },
  MEDIUM: { bg: 'rgba(245, 158, 11, 0.7)', border: '#f59e0b' },
  HIGH: { bg: 'rgba(249, 115, 22, 0.7)', border: '#f97316' },
  URGENT: { bg: 'rgba(239, 68, 68, 0.7)', border: '#ef4444' },
}

const PriorityChart = ({ data, loading }) => {
  if (loading) {
    return <div className="chart-skeleton" style={{ height: 280, borderRadius: '50%', width: 280, margin: '0 auto' }} />
  }

  if (!data) {
    return (
      <div className="chart-empty">
        <BarChart3 size={32} />
        <span>No priority data available</span>
      </div>
    )
  }

  const entries = Object.entries(data).filter(([_, count]) => count > 0)

  if (entries.length === 0) {
    return (
      <div className="chart-empty">
        <BarChart3 size={32} />
        <span>No tasks to show priorities</span>
      </div>
    )
  }

  const chartData = {
    labels: entries.map(([key]) => key.charAt(0) + key.slice(1).toLowerCase()),
    datasets: [
      {
        data: entries.map(([_, count]) => count),
        backgroundColor: entries.map(([key]) => PRIORITY_COLORS[key]?.bg || 'rgba(156, 163, 175, 0.7)'),
        borderColor: entries.map(([key]) => PRIORITY_COLORS[key]?.border || '#9ca3af'),
        borderWidth: 2,
        hoverOffset: 8,
      },
    ],
  }

  const options = {
    responsive: true,
    maintainAspectRatio: false,
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
          <BarChart3 size={16} />
          <span>Priority Distribution</span>
        </div>
      </div>
      <div className="chart-body chart-body-center">
        <Pie data={chartData} options={options} />
      </div>
    </div>
  )
}

export default PriorityChart
