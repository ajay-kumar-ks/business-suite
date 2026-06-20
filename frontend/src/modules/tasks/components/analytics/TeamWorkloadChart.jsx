import React from 'react'
import { Bar } from 'react-chartjs-2'
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement,
  Title,
  Tooltip,
  Legend,
} from 'chart.js'
import { Users } from 'lucide-react'

ChartJS.register(CategoryScale, LinearScale, BarElement, Title, Tooltip, Legend)

const WORKLOAD_COLORS = {
  todo: '#6b7280',
  in_progress: '#3b82f6',
  on_hold: '#f59e0b',
  on_review: '#8b5cf6',
  completed: '#22c55e',
  overdue: '#ef4444',
}

const WORKLOAD_LABELS = {
  todo: 'Todo',
  in_progress: 'In Progress',
  on_hold: 'On Hold',
  on_review: 'On Review',
  completed: 'Completed',
  overdue: 'Overdue',
}

const TeamWorkloadChart = ({ data, loading }) => {
  if (loading) {
    return <div className="chart-skeleton" style={{ height: 300 }} />
  }

  if (!data || data.length === 0) {
    return (
      <div className="chart-empty">
        <Users size={32} />
        <span>No team workload data available</span>
      </div>
    )
  }

  // Limit to top 10 team members for readability
  const topMembers = data.slice(0, 10)

  const chartData = {
    labels: topMembers.map((m) => m.name),
    datasets: [
      {
        label: 'Todo',
        data: topMembers.map((m) => m.todo),
        backgroundColor: WORKLOAD_COLORS.todo,
        borderRadius: 2,
      },
      {
        label: 'In Progress',
        data: topMembers.map((m) => m.in_progress),
        backgroundColor: WORKLOAD_COLORS.in_progress,
        borderRadius: 2,
      },
      {
        label: 'On Hold',
        data: topMembers.map((m) => m.on_hold),
        backgroundColor: WORKLOAD_COLORS.on_hold,
        borderRadius: 2,
      },
      {
        label: 'On Review',
        data: topMembers.map((m) => m.on_review),
        backgroundColor: WORKLOAD_COLORS.on_review,
        borderRadius: 2,
      },
      {
        label: 'Completed',
        data: topMembers.map((m) => m.completed),
        backgroundColor: WORKLOAD_COLORS.completed,
        borderRadius: 2,
      },
      {
        label: 'Overdue',
        data: topMembers.map((m) => m.overdue),
        backgroundColor: WORKLOAD_COLORS.overdue,
        borderRadius: 2,
      },
    ],
  }

  const options = {
    indexAxis: 'y',
    responsive: true,
    maintainAspectRatio: false,
    interaction: {
      mode: 'index',
      intersect: false,
    },
    plugins: {
      legend: {
        position: 'top',
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
      },
    },
    scales: {
      x: {
        stacked: true,
        beginAtZero: true,
        ticks: {
          stepSize: 1,
          font: { size: 11 },
        },
        grid: {
          color: 'var(--border)',
          drawBorder: false,
        },
      },
      y: {
        stacked: true,
        grid: { display: false },
        ticks: { font: { size: 11 } },
      },
    },
  }

  return (
    <div className="chart-container chart-container-wide">
      <div className="chart-header">
        <div className="chart-title">
          <Users size={16} />
          <span>Team Workload</span>
        </div>
      </div>
      <div className="chart-body" style={{ minHeight: 300 }}>
        <Bar data={chartData} options={options} />
      </div>
    </div>
  )
}

export default TeamWorkloadChart
