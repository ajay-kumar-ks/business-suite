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
    // If an accounts endpoint fails with a server error, the cached tenant_id
    // may be stale (e.g. tenant was deleted from the database). Clear it so
    // the next request re-fetches a valid tenant.
    if (error.response?.status === 500 &&
        error.config?.url?.startsWith('/accounts/') &&
        !error.config?.url?.startsWith('/accounts/tenants')) {
      localStorage.removeItem('tenant_id')
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
  getStatus: () => api.get('/crm/'),
}

export const tasksAPI = {
  getStatus: () =>
    api.get('/tasks/'),
}

export default api
