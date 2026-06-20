import api from '../../../services/api'

export const taskAiApi = {
  /**
   * Get AI suggestions for a task draft (by title + description).
   * Returns: { subtasks, dependencies, suggested_assignee, suggested_priority, estimated_effort_hours, explanation }
   */
  getSuggestions: (title, description = '') => {
    const params = { title }
    if (description) params.description = description
    return api.get('/tasks/ai/suggestions', { params })
  },

  /**
   * Get AI suggestions for an existing task (by task ID).
   */
  getSuggestionsForTask: (taskId) =>
    api.get(`/tasks/${taskId}/ai/suggestions`),
}
