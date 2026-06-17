import axios from 'axios'

const API_BASE_URL = '/api'

const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
})

// Add token to requests
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('access_token')
  if (token) {
    config.headers.Authorization = `Bearer ${token}`
  }
  return config
})

// Handle response errors
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      localStorage.removeItem('access_token')
      window.location.href = '/login'
    }
    return Promise.reject(error)
  }
)

export const authAPI = {
  login: (username, password) =>
    api.post('/auth/login', { username, password }),
  getDashboard: () =>
    api.get('/auth/dashboard'),
}

export const hrAPI = {
  getStatus: () =>
    api.get('/hr/'),
}

export const accountsAPI = {
  getStatus: () =>
    api.get('/accounts/'),
}

export const crmAPI = {
  getStatus: () =>
    api.get('/crm/'),
}

export const tasksAPI = {
  getStatus: () =>
    api.get('/tasks/'),
}

export default api
