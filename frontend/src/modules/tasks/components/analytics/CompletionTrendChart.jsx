import React, { useRef, useEffect } from 'react'
import { Bar } from 'react-chartjs-2'
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
  Filler,
} from 'chart.js'
import { TrendingUp } from 'lucide-react'

ChartJS.register(
  CategoryScale,
  LinearScale,
  BarElement,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
  Filler
)

const CompletionTrendChart = ({ data, period, onPeriodChange, loading }) => {
  const chartRef = useRef(null)

  useEffect(() => {
    if (chartRef.current) {
      const raf = requestAnimationFrame(() => chartRef.current.resize())
      return () => cancelAnimationFrame(raf)
    }
  }, [data])

  if (loading) {
    return <div className="chart-skeleton" style={{ height: 300 }} />
  }

  if (!data || !data.labels || data.labels.length === 0) {
    return (
      <div className="chart-empty">
        <TrendingUp size={32} />
        <span>No trend data available yet</span>
      </div>
    )
  }

  const chartData = {
    labels: data.labels.map((d) => {
      const date = new Date(d + 'T00:00:00')
      return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
    }),
    datasets: [
      {
        label: 'Created',
        data: data.created,
        backgroundColor: 'rgba(59, 130, 246, 0.6)',
        borderColor: '#3b82f6',
        borderWidth: 1,
        borderRadius: 4,
      },
      {
        label: 'Completed',
        data: data.completed,
        backgroundColor: 'rgba(34, 197, 94, 0.6)',
        borderColor: '#22c55e',
        borderWidth: 1,
        borderRadius: 4,
      },
      {
        label: 'Overdue',
        data: data.overdue,
        backgroundColor: 'rgba(239, 68, 68, 0.6)',
        borderColor: '#ef4444',
        borderWidth: 1,
        borderRadius: 4,
      },
    ],
  }

  const options = {
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
          padding: 16,
          font: { size: 12 },
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
        grid: { display: false },
        ticks: { font: { size: 11 } },
      },
      y: {
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
    },
  }

  return (
    <div className="chart-container">
      <div className="chart-header">
        <div className="chart-title">
          <TrendingUp size={16} />
          <span>Completion Trend</span>
        </div>
        <div className="chart-period-toggle">
          {['7d', '30d', '90d'].map((p) => (
            <button
              key={p}
              className={`period-btn ${period === p ? 'active' : ''}`}
              onClick={() => onPeriodChange(p)}
            >
              {p === '7d' ? '7 Days' : p === '30d' ? '30 Days' : '90 Days'}
            </button>
          ))}
        </div>
      </div>
      <div className="chart-body">
        <Bar ref={chartRef} data={chartData} options={options} />
      </div>
    </div>
  )
}

export default CompletionTrendChart
