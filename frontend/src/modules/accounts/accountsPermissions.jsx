import React, { createContext, useContext, useEffect, useMemo, useState } from 'react'
import { useAuth } from '../../context/AuthContext'
import { hrAPI } from '../hr/services/hrApi'

const DEPT_ADMIN = 'admin'
const DEPT_FINANCE = 'finance'
const DEPT_HR = 'hr'
const DEPT_MARKETING = 'marketing'
const DEPT_OPERATIONS = 'operations'
const DEPT_SALES = 'sales'
const DEPT_IT = 'it'
const DEPT_UNKNOWN = 'unknown'

const ACCOUNT_PAGES = [
  { id: 'overview', label: 'Overview' },
  { id: 'coa', label: 'Chart of Accounts' },
  { id: 'journals', label: 'Journals' },
  { id: 'ledger', label: 'Ledger' },
  { id: 'transactions', label: 'Transactions' },
  { id: 'ar', label: 'Accounts Receivable' },
  { id: 'ap', label: 'Accounts Payable' },
  { id: 'budgets', label: 'Budgets' },
  { id: 'reports', label: 'Reports' },
]

const PAGE_ACCESS = {
  [DEPT_ADMIN]: ACCOUNT_PAGES.map((page) => page.id),
  [DEPT_FINANCE]: ACCOUNT_PAGES.map((page) => page.id),
  [DEPT_HR]: ['overview', 'budgets'],
  [DEPT_MARKETING]: ['overview', 'transactions', 'budgets'],
  [DEPT_OPERATIONS]: ['overview', 'transactions', 'budgets'],
  [DEPT_SALES]: ['overview', 'ar'],
  [DEPT_IT]: ['overview', 'transactions', 'budgets'],
}

const ACTION_ACCESS = {
  createExpense: [DEPT_ADMIN, DEPT_FINANCE, DEPT_MARKETING, DEPT_OPERATIONS, DEPT_IT],
  createIncome: [DEPT_ADMIN, DEPT_FINANCE],
  createJournal: [DEPT_ADMIN, DEPT_FINANCE],
  submitJournal: [DEPT_ADMIN, DEPT_FINANCE],
  approveJournal: [DEPT_ADMIN, DEPT_FINANCE],
  postJournal: [DEPT_ADMIN, DEPT_FINANCE],
  createInvoice: [DEPT_ADMIN, DEPT_FINANCE, DEPT_SALES],
  createInvoicePayment: [DEPT_ADMIN, DEPT_FINANCE],
  createCustomer: [DEPT_ADMIN, DEPT_FINANCE, DEPT_SALES],
  createVendor: [DEPT_ADMIN, DEPT_FINANCE],
  createBill: [DEPT_ADMIN, DEPT_FINANCE],
  createBillPayment: [DEPT_ADMIN, DEPT_FINANCE],
  createBudget: [DEPT_ADMIN, DEPT_FINANCE, DEPT_HR, DEPT_MARKETING, DEPT_OPERATIONS, DEPT_IT],
  manageBudgetLines: [DEPT_ADMIN, DEPT_FINANCE, DEPT_HR, DEPT_MARKETING, DEPT_OPERATIONS, DEPT_IT],
  viewReports: [DEPT_ADMIN, DEPT_FINANCE],
  createCOA: [DEPT_ADMIN, DEPT_FINANCE],
}

const normalizeDepartment = (user, profile) => {
  if (user?.is_admin) {
    return DEPT_ADMIN
  }

  const departmentName = profile?.employee?.department_name || profile?.employee?.department || profile?.employee?.role_name || ''
  const normalized = departmentName.trim().toLowerCase()

  if (normalized.includes('finance') || normalized.includes('accountant')) return DEPT_FINANCE
  if (normalized === 'hr' || normalized.includes('human resources')) return DEPT_HR
  if (normalized.includes('marketing')) return DEPT_MARKETING
  if (normalized.includes('operations') || normalized.includes('operation')) return DEPT_OPERATIONS
  if (normalized.includes('sales')) return DEPT_SALES
  if (normalized === 'it' || normalized.includes('information technology') || normalized.includes('technology')) return DEPT_IT

  return DEPT_UNKNOWN
}

const getAllowedPages = (department) => {
  const allowed = PAGE_ACCESS[department] || ['overview']
  return ACCOUNT_PAGES.filter((page) => allowed.includes(page.id))
}

const AccountsPermissionsContext = createContext(null)

export const AccountsPermissionsProvider = ({ children }) => {
  const { user } = useAuth()
  const [profile, setProfile] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let active = true

    const fetchProfile = async () => {
      if (!user) {
        if (active) {
          setProfile(null)
          setLoading(false)
        }
        return
      }

      setLoading(true)
      try {
        const response = await hrAPI.getMyProfile()
        if (active) {
          setProfile(response.data)
        }
      } catch {
        if (active) {
          setProfile(null)
        }
      } finally {
        if (active) {
          setLoading(false)
        }
      }
    }

    fetchProfile()

    return () => {
      active = false
    }
  }, [user])

  const department = useMemo(() => normalizeDepartment(user, profile), [user, profile])
  const allowedPages = useMemo(() => getAllowedPages(department), [department])
  const canPerformAction = useMemo(
    () => (action) => ACTION_ACCESS[action]?.includes(department) ?? false,
    [department],
  )

  return (
    <AccountsPermissionsContext.Provider value={{ department, profile, loading, allowedPages, canPerformAction }}>
      {children}
    </AccountsPermissionsContext.Provider>
  )
}

export const useAccountsPermissions = () => {
  const context = useContext(AccountsPermissionsContext)
  if (!context) {
    throw new Error('useAccountsPermissions must be used within AccountsPermissionsProvider')
  }
  return context
}

export const isPageAllowed = (department, pageId) => {
  return PAGE_ACCESS[department]?.includes(pageId) ?? false
}

export const ACCOUNT_DEPARTMENTS = {
  DEPT_ADMIN,
  DEPT_FINANCE,
  DEPT_HR,
  DEPT_MARKETING,
  DEPT_OPERATIONS,
  DEPT_SALES,
  DEPT_IT,
}