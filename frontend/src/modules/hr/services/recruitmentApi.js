import api from '../../../services/api'

export const recruitmentAPI = {
  // ── Pipeline Templates ──
  getPipelineTemplates: () =>
    api.get('/recruitment/pipeline-templates'),

  getPipelineTemplate: (id) =>
    api.get(`/recruitment/pipeline-templates/${id}`),

  createPipelineTemplate: (data) =>
    api.post('/recruitment/pipeline-templates', data),

  updatePipelineTemplate: (id, data) =>
    api.put(`/recruitment/pipeline-templates/${id}`, data),

  deletePipelineTemplate: (id) =>
    api.delete(`/recruitment/pipeline-templates/${id}`),

  seedPipelines: () =>
    api.post('/recruitment/seed-pipelines'),

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

  // ── Convert to Employee (from Onboarded) ──
  convertToEmployee: (id, data) =>
    api.post(`/recruitment/candidates/${id}/convert-to-employee`, data),
}
