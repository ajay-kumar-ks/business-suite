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
  getUsers: () =>
    api.get('/auth/users'),
}

const DEFAULT_TENANT_NAME = 'Default Tenant'

const getTenantId = () => {
  return localStorage.getItem('tenant_id') || null
}

const setTenantId = (tenantId) => {
  if (tenantId) {
    localStorage.setItem('tenant_id', tenantId)
  }
}

const shouldAttachTenantHeader = (url) => {
  if (!url) return false
  return (
    url.startsWith('/accounts/') &&
    !url.startsWith('/accounts/tenants')
  )
}

const ensureTenantId = async () => {
  let tenantId = getTenantId()
  if (tenantId) return tenantId

  try {
    const tenantsResponse = await api.get('/accounts/tenants')
    const tenants = tenantsResponse.data

    if (Array.isArray(tenants) && tenants.length > 0) {
      tenantId = tenants[0].id
      setTenantId(tenantId)
      return tenantId
    }

    const createResponse = await api.post('/accounts/tenants', { name: DEFAULT_TENANT_NAME })
    tenantId = createResponse.data.id
    setTenantId(tenantId)
    return tenantId
  } catch (error) {
    return null
  }
}

api.interceptors.request.use(async (config) => {
  const token = localStorage.getItem('access_token')
  if (token) {
    config.headers.Authorization = `Bearer ${token}`
  }

  if (shouldAttachTenantHeader(config.url)) {
    const tenantId = await ensureTenantId()
    if (tenantId) {
      config.headers['X-Tenant-ID'] = tenantId
    }
  }

  return config
})

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
  
  // Clients
  listClients: (params = {}) => api.get('/crm/clients', { params }),
  getClient: (id) => api.get(`/crm/clients/${id}`),
  createClient: (data) => api.post('/crm/clients', data),
  updateClient: (id, data) => api.put(`/crm/clients/${id}`, data),
  deleteClient: (id) => api.delete(`/crm/clients/${id}`),
  addProjectToClient: (id, data) => api.post(`/crm/clients/${id}/add-project`, data),
  
  // Pipelines
  listPipelines: () => api.get('/crm/pipelines'),
  getPipeline: (id) => api.get(`/crm/pipelines/${id}`),
  createPipeline: (data) => api.post('/crm/pipelines', data),
  updatePipeline: (id, data) => api.patch(`/crm/pipelines/${id}`, data),
  
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
  listActivities: (params = {}) => api.get('/crm/activities', { params }),
}

export const tasksAPI = {
  getStatus: () =>
    api.get('/tasks/'),
}

export default api
