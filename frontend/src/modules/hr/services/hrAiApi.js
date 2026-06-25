import api from '../../../services/api'

export const hrAiAPI = {
  getInsights: async () => {
    const res = await api.get('/hr/ai-insights')
    return res.data
  },
}
