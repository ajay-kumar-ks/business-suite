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

const getTenantId = () => {
  return localStorage.getItem('tenant_id') || '1'
}

const tenantHeaders = () => ({
  'X-Tenant-ID': getTenantId(),
})

export const accountsAPI = {
  getStatus: () => api.get('/accounts/'),
  listTenants: () => api.get('/accounts/tenants'),
  createTenant: (data) => api.post('/accounts/tenants', data),
  listCOA: () => api.get('/accounts/coa', { headers: tenantHeaders() }),
  createCOA: (data) => api.post('/accounts/coa', data, { headers: tenantHeaders() }),
  listJournals: () => api.get('/accounts/journals', { headers: tenantHeaders() }),
  createJournal: (data) => api.post('/accounts/journals', data, { headers: tenantHeaders() }),
  submitJournal: (id) => api.post(`/accounts/journals/${id}/submit`, null, { headers: tenantHeaders() }),
  approveJournal: (id) => api.post(`/accounts/journals/${id}/approve`, null, { headers: tenantHeaders() }),
  postJournal: (id) => api.post(`/accounts/journals/${id}/post`, null, { headers: tenantHeaders() }),
  listLedger: () => api.get('/accounts/ledger', { headers: tenantHeaders() }),
  createExpense: (data) => api.post('/accounts/expenses', data, { headers: tenantHeaders() }),
  listExpenses: () => api.get('/accounts/expenses', { headers: tenantHeaders() }),
  createIncome: (data) => api.post('/accounts/income', data, { headers: tenantHeaders() }),
  listIncome: () => api.get('/accounts/income', { headers: tenantHeaders() }),
  createCustomer: (data) => api.post('/accounts/customers', data, { headers: tenantHeaders() }),
  listCustomers: () => api.get('/accounts/customers', { headers: tenantHeaders() }),
  createInvoice: (data) => api.post('/accounts/invoices', data, { headers: tenantHeaders() }),
  listInvoices: () => api.get('/accounts/invoices', { headers: tenantHeaders() }),
  createInvoicePayment: (invoiceId, data) => api.post(`/accounts/invoices/${invoiceId}/payments`, data, { headers: tenantHeaders() }),
  createVendor: (data) => api.post('/accounts/vendors', data, { headers: tenantHeaders() }),
  listVendors: () => api.get('/accounts/vendors', { headers: tenantHeaders() }),
  createBill: (data) => api.post('/accounts/bills', data, { headers: tenantHeaders() }),
  listBills: () => api.get('/accounts/bills', { headers: tenantHeaders() }),
  createBillPayment: (billId, data) => api.post(`/accounts/bills/${billId}/payments`, data, { headers: tenantHeaders() }),
  createBudget: (data) => api.post('/accounts/budgets', data, { headers: tenantHeaders() }),
  listBudgets: () => api.get('/accounts/budgets', { headers: tenantHeaders() }),
  createBudgetLine: (budgetId, data) => api.post(`/accounts/budgets/${budgetId}/lines`, data, { headers: tenantHeaders() }),
  listBudgetLines: (budgetId) => api.get(`/accounts/budgets/${budgetId}/lines`, { headers: tenantHeaders() }),
  getTrialBalance: () => api.get('/accounts/reports/trial-balance', { headers: tenantHeaders() }),
  getProfitLoss: () => api.get('/accounts/reports/profit-loss', { headers: tenantHeaders() }),
  getBalanceSheet: () => api.get('/accounts/reports/balance-sheet', { headers: tenantHeaders() }),
}

export const crmAPI = {
  getStatus: () => api.get('/crm/'),
}

export const tasksAPI = {
  getStatus: () =>
    api.get('/tasks/'),
}

export default api
