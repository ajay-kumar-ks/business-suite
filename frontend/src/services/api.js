import axios from 'axios'

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || '/api'

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
    }
    // If an accounts endpoint fails with a server error, the cached tenant_id
    // may be stale (e.g. tenant was deleted from the database). Clear it so
    // the next request re-fetches a valid tenant.
    if (error.response?.status === 500 &&
        error.config?.url?.startsWith('/accounts/') &&
        !error.config?.url?.startsWith('/accounts/tenants')) {
      localStorage.removeItem('tenant_id')
    }
    if (error.response?.data?.detail) {
      error.response.data.detail = formatErrorDetail(error.response.data.detail)
    }
    return Promise.reject(error)
  }
)

const formatErrorDetail = (detail) => {
  if (detail == null) return ''
  if (typeof detail === 'string') return detail
  if (Array.isArray(detail)) {
    return detail
      .map((item) => {
        if (typeof item === 'string') return item
        if (item?.msg) {
          const location = Array.isArray(item.loc) ? item.loc.join('.') : item.loc
          return location ? `${location}: ${item.msg}` : item.msg
        }
        if (typeof item === 'object') return JSON.stringify(item)
        return String(item)
      })
      .join(' | ')
  }
  if (typeof detail === 'object') {
    return Object.entries(detail)
      .map(([key, value]) => `${key}: ${formatErrorDetail(value)}`)
      .join(' | ')
  }
  return String(detail)
}

export const getAPIErrorMessage = (error, fallback = 'An unexpected error occurred') => {
  const detail = error?.response?.data?.detail
  if (detail) return formatErrorDetail(detail)
  const message = error?.response?.data?.message || error?.message
  return message ? String(message) : fallback
}

export const authAPI = {
  login: (username, password) =>
    api.post('/auth/login', { username, password }),
  getDashboard: () =>
    api.get('/auth/dashboard'),
  getUsers: () =>
    api.get('/auth/users'),
}

// Accounts no longer require X-Tenant-ID in single-company mode.
// All account routes use the default tenant on the backend.

export const accountsAPI = {
  getStatus: () => api.get('/accounts/'),
  listTenants: () => api.get('/accounts/tenants'),
  createTenant: (data) => api.post('/accounts/tenants', data),
  listCOA: () => api.get('/accounts/coa'),
  createCOA: (data) => api.post('/accounts/coa', data),
  listJournals: () => api.get('/accounts/journals'),
  createJournal: (data) => api.post('/accounts/journals', data),
  submitJournal: (id) => api.post(`/accounts/journals/${id}/submit`, null),
  approveJournal: (id) => api.post(`/accounts/journals/${id}/approve`, null),
  postJournal: (id) => api.post(`/accounts/journals/${id}/post`, null),
  listLedger: () => api.get('/accounts/ledger'),
  createExpense: (data) => api.post('/accounts/expenses', data),
  listExpenses: () => api.get('/accounts/expenses'),
  createIncome: (data) => api.post('/accounts/income', data),
  listIncome: () => api.get('/accounts/income'),
  createCustomer: (data) => api.post('/accounts/customers', data),
  listCustomers: () => api.get('/accounts/customers'),
  createInvoice: (data) => api.post('/accounts/invoices', data),
  listInvoices: () => api.get('/accounts/invoices'),
  createInvoicePayment: (invoiceId, data) => api.post(`/accounts/invoices/${invoiceId}/payments`, data),
  createVendor: (data) => api.post('/accounts/vendors', data),
  listVendors: () => api.get('/accounts/vendors'),
  createBill: (data) => api.post('/accounts/bills', data),
  listBills: () => api.get('/accounts/bills'),
  createBillPayment: (billId, data) => api.post(`/accounts/bills/${billId}/payments`, data),
  createBudget: (data) => api.post('/accounts/budgets', data),
  listBudgets: () => api.get('/accounts/budgets'),
  createBudgetLine: (budgetId, data) => api.post(`/accounts/budgets/${budgetId}/lines`, data),
  listBudgetLines: (budgetId) => api.get(`/accounts/budgets/${budgetId}/lines`),
  getTrialBalance: () => api.get('/accounts/reports/trial-balance'),
  getProfitLoss: () => api.get('/accounts/reports/profit-loss'),
  getBalanceSheet: () => api.get('/accounts/reports/balance-sheet'),
  getAIInsights: () => api.get('/accounts/ai/insights'),
}

export const paymentsAPI = {
  createOrder: (data) => api.post('/payments/create-order', data),
  verifyPayment: (data) => api.post('/payments/verify', data),
  listPayments: (params = {}) => api.get('/payments/', { params }),
  getPayment: (id) => api.get(`/payments/${id}`),
  getRazorpayKey: () => api.get('/payments/key'),
}

export const crmAPI = {
  // Contacts
  listContacts: (params = {}) => api.get('/crm/contacts', { params }),
  getContact: (id) => api.get(`/crm/contacts/${id}`),
  createContact: (data) => api.post('/crm/contacts', data),
  updateContact: (id, data) => api.put(`/crm/contacts/${id}`, data),
  deleteContact: (id) => api.delete(`/crm/contacts/${id}`),
  archiveContact: (id) => api.patch(`/crm/contacts/${id}/archive`),
  mergeContacts: (data) => api.post('/crm/contacts/merge', data),
  
  // Activities
  getActivities: (contactId, params = {}) => api.get(`/crm/contacts/${contactId}/activities`, { params }),
  createActivity: (contactId, data) => api.post(`/crm/contacts/${contactId}/activities`, data),
  
  // Leads
  listLeads: (params = {}) => api.get('/crm/leads', { params }),
  getLead: (id) => api.get(`/crm/leads/${id}`),
  createLead: (data) => api.post('/crm/leads', data),
  updateLead: (id, data) => api.put(`/crm/leads/${id}`, data),
  deleteLead: (id) => api.delete(`/crm/leads/${id}`),
  moveLead: (id, data) => api.put(`/crm/leads/${id}/move`, data),
  convertLead: (id) => api.post(`/crm/leads/${id}/convert`),
  scoreLead: (id) => api.post(`/crm/leads/${id}/score`),
  scoreAllLeads: (params = {}) => api.post('/crm/leads/score-all', null, { params }),
  
  // Clients
  listClients: (params = {}) => api.get('/crm/clients', { params }),
  getClient: (id) => api.get(`/crm/clients/${id}`),
  createClient: (data) => api.post('/crm/clients', data),
  updateClient: (id, data) => api.put(`/crm/clients/${id}`, data),
  deleteClient: (id) => api.delete(`/crm/clients/${id}`),
  addProjectToClient: (id, data) => api.post(`/crm/clients/${id}/add-project`, data),
  
  // Pipelines
  listPipelines: (params = {}) => api.get('/crm/pipelines', { params }),
  getPipeline: (id) => api.get(`/crm/pipelines/${id}`),
  createPipeline: (data) => api.post('/crm/pipelines', data),
  updatePipeline: (id, data) => api.patch(`/crm/pipelines/${id}`, data),
  
  // Pipeline Assignments
  getPipelineAssignment: (pipelineId) => api.get(`/crm/pipelines/${pipelineId}/assignments`),
  savePipelineAssignment: (pipelineId, data) => api.put(`/crm/pipelines/${pipelineId}/assignments`, data),
  applyPipelineAssignment: (pipelineId, data) => api.post(`/crm/pipelines/${pipelineId}/assignments/apply`, data),
  
  // Phases
  getPhases: (pipelineId) => api.get(`/crm/pipelines/${pipelineId}/phases`),
  createPhase: (pipelineId, data) => api.post(`/crm/pipelines/${pipelineId}/phases`, data),
  updatePhase: (pipelineId, phaseId, data) => api.put(`/crm/pipelines/${pipelineId}/phases/${phaseId}`, data),
  
  // Tags
  getTags: () => api.get('/crm/tags'),
  
  // General
  getStatus: () => api.get('/crm/'),
  // Notifications
  getDueFollowups: (params = {}) => api.get('/crm/contacts/notifications/followups', { params }),
  // Activities
  // Note: activities endpoints are under the contacts router, so include '/contacts'
  listActivities: (params = {}) => api.get('/crm/contacts/activities', { params }),

  // Lead / Client Logs
  getLeadLogs: (id, params = {}) => api.get(`/crm/leads/${id}/logs`, { params }),
  createLeadLog: (id, data) => api.post(`/crm/leads/${id}/logs`, data),
  getLeadPayments: (id) => api.get(`/crm/leads/${id}/payments`),
  requestLeadPayment: (id, data) => api.post(`/crm/leads/${id}/payments/request`, data),
  createLeadManualPayment: (id, data) => api.post(`/crm/leads/${id}/payments/manual`, data),
  verifyLeadPayment: (id, data) => api.post(`/crm/leads/${id}/payments/verify`, data),
  getClientLogs: (id, params = {}) => api.get(`/crm/clients/${id}/logs`, { params }),
  createClientLog: (id, data) => api.post(`/crm/clients/${id}/logs`, data),
}

export const tasksAPI = {
  getStatus: () =>
    api.get('/tasks/'),
}

export default api
