import React, { useState, useEffect, useCallback } from 'react'
import { BarChart3, RefreshCw } from 'lucide-react'
import Loader from '../../../components/ui/Loader'
import PerformanceSummary from '../components/analytics/PerformanceSummary'
import CompletionTrendChart from '../components/analytics/CompletionTrendChart'
import StatusDistributionChart from '../components/analytics/StatusDistributionChart'
import PriorityChart from '../components/analytics/PriorityChart'
import TeamWorkloadChart from '../components/analytics/TeamWorkloadChart'
import ExportButton from '../components/analytics/ExportButton'
import { taskAnalyticsApi } from '../services/taskAnalyticsApi'
import { useAuth } from '../../../context/AuthContext'
import '../styles/TasksAnalytics.css'

const TasksAnalyticsPage = () => {
  const { user } = useAuth()
  const isAdmin = user?.is_admin

  const [summary, setSummary] = useState(null)
  const [trend, setTrend] = useState(null)
  const [statusDist, setStatusDist] = useState(null)
  const [priorityDist, setPriorityDist] = useState(null)
  const [workload, setWorkload] = useState(null)

  const [period, setPeriod] = useState('7d')
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [error, setError] = useState(null)

  const fetchAll = useCallback(async (showLoader = true) => {
    try {
      if (showLoader) setLoading(true)
      else setRefreshing(true)
      setError(null)

      const [summaryRes, trendRes, statusRes, priorityRes, workloadRes] = await Promise.all([
        taskAnalyticsApi.getSummary(),
        taskAnalyticsApi.getCompletionTrend(period),
        taskAnalyticsApi.getStatusDistribution(),
        taskAnalyticsApi.getPriorityDistribution(),
        taskAnalyticsApi.getTeamWorkload(),
      ])

      setSummary(summaryRes.data)
      setTrend(trendRes.data)
      setStatusDist(statusRes.data)
      setPriorityDist(priorityRes.data)
      setWorkload(workloadRes.data)
    } catch (err) {
      console.error('Failed to fetch analytics:', err)
      setError('Failed to load analytics data. Make sure the server is running.')
    } finally {
      setLoading(false)
      setRefreshing(false)
    }
  }, [period])

  useEffect(() => {
    fetchAll()
  }, [fetchAll])

  const handlePeriodChange = (newPeriod) => {
    setPeriod(newPeriod)
  }

  const handleRefresh = () => {
    fetchAll(false)
  }

  if (loading) {
    return (
      <div className="tasks-analytics-page">
        <div className="analytics-header">
          <div className="analytics-header-title">
            <BarChart3 size={24} />
            <div>
              <h1>Analytics</h1>
              <p>Task performance metrics and insights</p>
            </div>
          </div>
        </div>
        <div className="analytics-loading">
          <Loader size={32} />
          <span>Loading analytics...</span>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="tasks-analytics-page">
        <div className="analytics-header">
          <div className="analytics-header-title">
            <BarChart3 size={24} />
            <div>
              <h1>Analytics</h1>
              <p>Task performance metrics and insights</p>
            </div>
          </div>
        </div>
        <div className="analytics-error">{error}</div>
      </div>
    )
  }

  return (
    <div className="tasks-analytics-page">
      {/* Header */}
      <div className="analytics-header">
        <div className="analytics-header-title">
          <BarChart3 size={24} />
          <div>
            <h1>Analytics</h1>
            <p>Task performance metrics and insights</p>
          </div>
        </div>
        <div className="analytics-header-actions">
          <ExportButton />
          <button
            className="analytics-refresh-btn"
            onClick={handleRefresh}
            disabled={refreshing}
            title="Refresh data"
          >
            <RefreshCw size={16} className={refreshing ? 'spin-icon' : ''} />
            <span>{refreshing ? 'Refreshing...' : 'Refresh'}</span>
          </button>
        </div>
      </div>

      {/* KPI Summary Cards */}
      <PerformanceSummary summary={summary} loading={loading} />

      {/* Charts Grid */}
      <div className="analytics-charts-grid">
        <div className="analytics-chart-cell chart-cell-wide">
          <CompletionTrendChart
            data={trend}
            period={period}
            onPeriodChange={handlePeriodChange}
            loading={loading}
          />
        </div>

        <div className="analytics-chart-cell">
          <StatusDistributionChart data={statusDist} loading={loading} />
        </div>

        <div className="analytics-chart-cell">
          <PriorityChart data={priorityDist} loading={loading} />
        </div>
      </div>

      {/* Team Workload */}
      {isAdmin && (
        <div className="analytics-charts-grid">
          <div className="analytics-chart-cell chart-cell-full">
            <TeamWorkloadChart data={workload} loading={loading} />
          </div>
        </div>
      )}
    </div>
  )
}

export default TasksAnalyticsPage
