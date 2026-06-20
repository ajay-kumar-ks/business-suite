import api from '../../../services/api'

export const taskAnalyticsApi = {
  getSummary: () =>
    api.get('/tasks/analytics/summary'),

  getCompletionTrend: (period = '7d') =>
    api.get('/tasks/analytics/completion-trend', { params: { period } }),

  getStatusDistribution: () =>
    api.get('/tasks/analytics/status-distribution'),

  getPriorityDistribution: () =>
    api.get('/tasks/analytics/priority-distribution'),

  getTeamWorkload: () =>
    api.get('/tasks/analytics/team-workload'),

  exportCsv: () =>
    api.get('/tasks/analytics/export', { responseType: 'blob' }),
}
