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

  // ── Comments ──

  getComments: (taskId) =>
    api.get(`/tasks/${taskId}/comments`),

  createComment: (taskId, data) =>
    api.post(`/tasks/${taskId}/comments`, data),

  deleteComment: (taskId, commentId) =>
    api.delete(`/tasks/${taskId}/comments/${commentId}`),

  // ── Activities ──

  getActivities: (taskId) =>
    api.get(`/tasks/${taskId}/activities`),

  // ── Dependencies ──

  getDependencies: (taskId) =>
    api.get(`/tasks/${taskId}/dependencies`),

  createDependency: (taskId, data) =>
    api.post(`/tasks/${taskId}/dependencies`, data),

  deleteDependency: (taskId, dependencyId) =>
    api.delete(`/tasks/${taskId}/dependencies/${dependencyId}`),

  // ── Sub-Tasks / Checklist ──

  getSubtasks: (taskId) =>
    api.get(`/tasks/${taskId}/subtasks`),

  createSubtask: (taskId, data) =>
    api.post(`/tasks/${taskId}/subtasks`, data),

  updateSubtask: (taskId, subtaskId, data) =>
    api.patch(`/tasks/${taskId}/subtasks/${subtaskId}`, data),

  deleteSubtask: (taskId, subtaskId) =>
    api.delete(`/tasks/${taskId}/subtasks/${subtaskId}`),

  // ── @Mentions ──

  searchUsers: (q) =>
    api.get('/tasks/users/search', { params: { q } }),

  // ── Notifications ──

  getNotifications: (unreadOnly = false) => {
    const params = unreadOnly ? { unread_only: 'true' } : {}
    return api.get('/tasks/notifications', { params })
  },

  getUnreadCount: () =>
    api.get('/tasks/notifications/unread-count'),

  markNotificationRead: (notificationId) =>
    api.patch(`/tasks/notifications/${notificationId}/read`),

  markAllNotificationsRead: () =>
    api.post('/tasks/notifications/read-all'),
}
