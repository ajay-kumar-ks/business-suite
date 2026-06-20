import React, { useEffect, useState, useCallback } from 'react'
import '../../../styles/ModulePage.css'
import { accountsAPI } from '../../../services/api'
import { useAccountsPermissions, isPageAllowed } from '../accountsPermissions'
import Input from '../../../components/ui/Input'
import Button from '../../../components/ui/Button'

const ARPage = () => {
  const { department, canPerformAction, loading } = useAccountsPermissions()
  if (loading) return <div className="module-page"><p>Loading...</p></div>
  if (!isPageAllowed(department, 'ar')) {
    return (
      <div className="module-page">
        <h2>Access Denied</h2>
        <p>You do not have permission to view Accounts Receivable.</p>
      </div>
    )
  }
  const [customers, setCustomers] = useState([])
  const [invoices, setInvoices] = useState([])
  const [customerForm, setCustomerForm] = useState({ name: '', email: '', phone: '', address: '' })
  const [invoiceForm, setInvoiceForm] = useState({ customer_id: '', invoice_number: '', amount: 0, description: '' })
  const [paymentForm, setPaymentForm] = useState({ amount: 0, reference: '' })
  const [selectedInvoice, setSelectedInvoice] = useState('')
  const [message, setMessage] = useState('')
  const [messageType, setMessageType] = useState('success')

  const loadData = useCallback(async () => {
    try {
      const [customerResponse, invoiceResponse] = await Promise.all([accountsAPI.listCustomers(), accountsAPI.listInvoices()])
      setCustomers(customerResponse.data)
      setInvoices(invoiceResponse.data)
    } catch (err) {
      setMessage('Failed to load AR data')
      setMessageType('error')
    }
  }, [])

  useEffect(() => {
    loadData()
  }, [loadData])

  const showMessage = (msg, type = 'success') => {
    setMessage(msg)
    setMessageType(type)
    setTimeout(() => setMessage(''), 4000)
  }

  const createCustomer = async (e) => {
    e.preventDefault()
    try {
      await accountsAPI.createCustomer(customerForm)
      showMessage('Customer created successfully!')
      setCustomerForm({ name: '', email: '', phone: '', address: '' })
      loadData()
    } catch (err) {
      showMessage(err.response?.data?.detail || 'Unable to create customer', 'error')
    }
  }

  const createInvoice = async (e) => {
    e.preventDefault()
    try {
      await accountsAPI.createInvoice(invoiceForm)
      showMessage('Invoice created successfully!')
      setInvoiceForm({ customer_id: '', invoice_number: '', amount: 0, description: '' })
      loadData()
    } catch (err) {
      showMessage(err.response?.data?.detail || 'Unable to create invoice', 'error')
    }
  }

  const createPayment = async (e) => {
    e.preventDefault()
    try {
      await accountsAPI.createInvoicePayment(selectedInvoice, {
        invoice_id: Number(selectedInvoice),
        ...paymentForm,
      })
      showMessage('Payment recorded successfully!')
      setPaymentForm({ amount: 0, reference: '' })
      loadData()
    } catch (err) {
      showMessage(err.response?.data?.detail || 'Unable to create payment', 'error')
    }
  }

  const StatusBadge = ({ status }) => (
    <span className={`status-badge ${status}`}>{status}</span>
  )

  const formatCurrency = (val) =>
    Number(val || 0).toLocaleString('en-IN', { style: 'currency', currency: 'INR', minimumFractionDigits: 2 })

  return (
    <div className="module-page">
      <h2>Accounts Receivable</h2>
      <p>Manage customers, invoices, and customer payments.</p>
      {message && <div className={messageType === 'error' ? 'error-message' : 'success-message'}>{message}</div>}

      {/* Customers Section */}
      <div className="accounts-summary">
        <h3>Customers</h3>
        {canPerformAction('createCustomer') && (
          <details>
            <summary style={{ cursor: 'pointer', marginBottom: '10px', fontWeight: 600, color: 'var(--primary)' }}>+ Add New Customer</summary>
            <form onSubmit={createCustomer} className="accounts-form">
              <div className="form-row">
                <Input id="customer-name" label="Name" value={customerForm.name} onChange={(e) => setCustomerForm({ ...customerForm, name: e.target.value })} />
                <Input id="customer-email" label="Email" value={customerForm.email} onChange={(e) => setCustomerForm({ ...customerForm, email: e.target.value })} />
              </div>
              <div className="form-row">
                <Input id="customer-phone" label="Phone" value={customerForm.phone} onChange={(e) => setCustomerForm({ ...customerForm, phone: e.target.value })} />
                <Input id="customer-address" label="Address" value={customerForm.address} onChange={(e) => setCustomerForm({ ...customerForm, address: e.target.value })} />
              </div>
              <Button type="submit">Create Customer</Button>
            </form>
          </details>
        )}
        <table className="accounts-table">
          <thead>
            <tr>
              <th>Name</th>
              <th>Email</th>
              <th>Phone</th>
              <th>Status</th>
            </tr>
          </thead>
          <tbody>
            {customers.length === 0 ? (
              <tr><td colSpan="4" className="empty-state">No customers yet.</td></tr>
            ) : (
              customers.map((c) => (
                <tr key={c.id}>
                  <td><strong>{c.name}</strong></td>
                  <td>{c.email || '—'}</td>
                  <td>{c.phone || '—'}</td>
                  <td><StatusBadge status={c.is_active === 'active' ? 'active' : 'draft'} /></td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Invoices Section */}
      <div className="accounts-summary" style={{ marginTop: '20px' }}>
        <h3>Invoices</h3>
        {canPerformAction('createInvoice') && (
          <details>
            <summary style={{ cursor: 'pointer', marginBottom: '10px', fontWeight: 600, color: 'var(--primary)' }}>+ Create New Invoice</summary>
            <form onSubmit={createInvoice} className="accounts-form">
              <div className="form-row">
                <div>
                  <label className="ui-input-label">Customer</label>
                  <select className="ui-input-field" value={invoiceForm.customer_id} onChange={(e) => setInvoiceForm({ ...invoiceForm, customer_id: Number(e.target.value) })}>
                    <option value="">Select customer</option>
                    {customers.map((customer) => (
                      <option key={customer.id} value={customer.id}>{customer.name}</option>
                    ))}
                  </select>
                </div>
                <Input id="invoice-number" label="Invoice Number" value={invoiceForm.invoice_number} onChange={(e) => setInvoiceForm({ ...invoiceForm, invoice_number: e.target.value })} />
              </div>
              <div className="form-row">
                <Input id="invoice-amount" label="Amount" type="number" value={invoiceForm.amount} onChange={(e) => setInvoiceForm({ ...invoiceForm, amount: Number(e.target.value) })} />
                <Input id="invoice-description" label="Description" value={invoiceForm.description} onChange={(e) => setInvoiceForm({ ...invoiceForm, description: e.target.value })} />
              </div>
              <Button type="submit">Create Invoice</Button>
            </form>
          </details>
        )}
        <table className="accounts-table">
          <thead>
            <tr>
              <th>Invoice #</th>
              <th>Customer</th>
              <th>Amount</th>
              <th>Paid</th>
              <th>Balance</th>
              <th>Status</th>
            </tr>
          </thead>
          <tbody>
            {invoices.length === 0 ? (
              <tr><td colSpan="6" className="empty-state">No invoices yet.</td></tr>
            ) : (
              invoices.map((inv) => {
                const customer = customers.find(c => c.id === inv.customer_id)
                const balance = Number(inv.amount) - Number(inv.paid_amount)
                return (
                  <tr key={inv.id}>
                    <td><strong>{inv.invoice_number}</strong></td>
                    <td>{customer?.name || `Customer #${inv.customer_id}`}</td>
                    <td>{formatCurrency(inv.amount)}</td>
                    <td>{formatCurrency(inv.paid_amount)}</td>
                    <td style={{ fontWeight: 700, color: balance > 0 ? '#f59e0b' : '#10b981' }}>{formatCurrency(balance)}</td>
                    <td><StatusBadge status={inv.status} /></td>
                  </tr>
                )
              })
            )}
          </tbody>
        </table>
      </div>

      {/* Payments Section */}
      <div className="accounts-summary" style={{ marginTop: '20px' }}>
        <h3>Record Payment</h3>
        {canPerformAction('createInvoicePayment') ? (
          <form onSubmit={createPayment} className="accounts-form">
            <div className="form-row">
              <div>
                <label className="ui-input-label">Invoice</label>
                <select className="ui-input-field" value={selectedInvoice} onChange={(e) => setSelectedInvoice(e.target.value)}>
                  <option value="">Select invoice</option>
                  {invoices.map((inv) => (
                    <option key={inv.id} value={inv.id}>{inv.invoice_number} - Balance: {formatCurrency(Number(inv.amount) - Number(inv.paid_amount))}</option>
                  ))}
                </select>
              </div>
              <Input id="payment-amount" label="Amount" type="number" value={paymentForm.amount} onChange={(e) => setPaymentForm({ ...paymentForm, amount: Number(e.target.value) })} />
            </div>
            <div className="form-row">
              <Input id="payment-reference" label="Reference" value={paymentForm.reference} onChange={(e) => setPaymentForm({ ...paymentForm, reference: e.target.value })} />
            </div>
            <Button type="submit">Record Payment</Button>
          </form>
        ) : (
          <div className="permission-warning" style={{ padding: '14px', border: '1px solid #f59e0b', borderRadius: '8px', background: '#fffbeb' }}>
            You do not have permission to record invoice payments.
          </div>
        )}
      </div>
    </div>
  )
}

export default ARPage
