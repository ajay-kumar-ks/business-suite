import api from '../../../services/api'

export const taskApi = {
  getTasks: (filters = {}) =>
    api.get('/tasks/', { params: filters }),

  createTask: (data) =>
    api.post('/tasks/', data),

  getTask: (id) =>
    api.get(`/tasks/${id}`),

  updateTask: (id, data) =>
    api.patch(`/tasks/${id}`, data),

  deleteTask: (id) =>
    api.delete(`/tasks/${id}`),

  getEmployees: (search) => {
    const params = search ? { search } : {}
    return api.get('/tasks/employees', { params })
  },

  uploadProof: (file) => {
    const formData = new FormData()
    formData.append('file', file)
    return api.post('/tasks/upload', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    })
  },
}
