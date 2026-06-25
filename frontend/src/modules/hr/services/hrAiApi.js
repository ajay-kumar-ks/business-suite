import api from '../../../services/api'

export const hrAiAPI = {
  getInsights: async () => {
    const res = await api.get('/hr/ai-insights')
    return res.data
  },

  generateJobDescription: async (data) => {
    const res = await api.post('/hr/ai/job-description', data)
    return res.data
  },
}
