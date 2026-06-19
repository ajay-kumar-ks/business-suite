import api from '../../../services/api'

export const recruitmentAPI = {
  // ── Dashboard ──
  getDashboard: () =>
    api.get('/recruitment/dashboard'),

  // ── Candidates CRUD ──
  getCandidates: (params = {}) =>
    api.get('/recruitment/candidates', { params }),

  getCandidate: (id) =>
    api.get(`/recruitment/candidates/${id}`),

  createCandidate: (data) =>
    api.post('/recruitment/candidates', data),

  updateCandidate: (id, data) =>
    api.put(`/recruitment/candidates/${id}`, data),

  deleteCandidate: (id) =>
    api.delete(`/recruitment/candidates/${id}`),

  // ── Stage Management ──
  moveStage: (id, targetStage) =>
    api.post(`/recruitment/candidates/${id}/move-stage`, { target_stage: targetStage }),

  // ── Convert to Employee ──
  convertToEmployee: (id, data) =>
    api.post(`/recruitment/candidates/${id}/convert-to-employee`, data),
}
