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

  getEmployees: () =>
    api.get('/tasks/employees'),
}
