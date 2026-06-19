import React, { useEffect, useState } from 'react'
import '../../../styles/ModulePage.css'
import { accountsAPI } from '../../../services/api'
import Input from '../../../components/ui/Input'
import Button from '../../../components/ui/Button'

const ARPage = () => {
  const [customers, setCustomers] = useState([])
  const [invoices, setInvoices] = useState([])
  const [customerForm, setCustomerForm] = useState({ name: '', email: '', phone: '', address: '' })
  const [invoiceForm, setInvoiceForm] = useState({ customer_id: '', invoice_number: '', amount: 0, description: '' })
  const [paymentForm, setPaymentForm] = useState({ amount: 0, reference: '' })
  const [selectedInvoice, setSelectedInvoice] = useState('')
  const [message, setMessage] = useState('')

  const loadData = async () => {
    try {
      const [customerResponse, invoiceResponse] = await Promise.all([accountsAPI.listCustomers(), accountsAPI.listInvoices()])
      setCustomers(customerResponse.data)
      setInvoices(invoiceResponse.data)
    } catch (err) {
      setMessage('Failed to load AR data')
    }
  }

  useEffect(() => {
    loadData()
  }, [])

  const createCustomer = async (e) => {
    e.preventDefault()
    try {
      await accountsAPI.createCustomer(customerForm)
      setMessage('Customer created')
      setCustomerForm({ name: '', email: '', phone: '', address: '' })
      loadData()
    } catch (err) {
      setMessage(err.response?.data?.detail || 'Unable to create customer')
    }
  }

  const createInvoice = async (e) => {
    e.preventDefault()
    try {
      await accountsAPI.createInvoice(invoiceForm)
      setMessage('Invoice created')
      setInvoiceForm({ customer_id: '', invoice_number: '', amount: 0, description: '' })
      loadData()
    } catch (err) {
      setMessage(err.response?.data?.detail || 'Unable to create invoice')
    }
  }

  const createPayment = async (e) => {
    e.preventDefault()
    try {
      await accountsAPI.createInvoicePayment(selectedInvoice, {
        invoice_id: Number(selectedInvoice),
        ...paymentForm,
      })
      setMessage('Payment recorded')
      setPaymentForm({ amount: 0, reference: '' })
      loadData()
    } catch (err) {
      setMessage(err.response?.data?.detail || 'Unable to create payment')
    }
  }

  return (
    <div className="module-page">
      <h2>Accounts Receivable</h2>
      <p>Manage customers, invoices, and customer payments.</p>
      {message && <div className="success-message">{message}</div>}

      <div className="accounts-summary">
        <h3>Create Customer</h3>
        <form onSubmit={createCustomer} className="accounts-form">
          <Input id="customer-name" label="Name" value={customerForm.name} onChange={(e) => setCustomerForm({ ...customerForm, name: e.target.value })} />
          <Input id="customer-email" label="Email" value={customerForm.email} onChange={(e) => setCustomerForm({ ...customerForm, email: e.target.value })} />
          <Input id="customer-phone" label="Phone" value={customerForm.phone} onChange={(e) => setCustomerForm({ ...customerForm, phone: e.target.value })} />
          <Input id="customer-address" label="Address" value={customerForm.address} onChange={(e) => setCustomerForm({ ...customerForm, address: e.target.value })} />
          <Button type="submit">Create Customer</Button>
        </form>
      </div>

      <div className="accounts-summary" style={{ marginTop: '24px' }}>
        <h3>Create Invoice</h3>
        <form onSubmit={createInvoice} className="accounts-form">
          <label htmlFor="invoice-customer" className="ui-input-label">Customer</label>
          <select id="invoice-customer" className="ui-input-field" value={invoiceForm.customer_id} onChange={(e) => setInvoiceForm({ ...invoiceForm, customer_id: Number(e.target.value) })}>
            <option value="">Select customer</option>
            {customers.map((customer) => (
              <option key={customer.id} value={customer.id}>{customer.name}</option>
            ))}
          </select>
          <Input id="invoice-number" label="Invoice Number" value={invoiceForm.invoice_number} onChange={(e) => setInvoiceForm({ ...invoiceForm, invoice_number: e.target.value })} />
          <Input id="invoice-amount" label="Amount" type="number" value={invoiceForm.amount} onChange={(e) => setInvoiceForm({ ...invoiceForm, amount: Number(e.target.value) })} />
          <Input id="invoice-description" label="Description" value={invoiceForm.description} onChange={(e) => setInvoiceForm({ ...invoiceForm, description: e.target.value })} />
          <Button type="submit">Create Invoice</Button>
        </form>
      </div>

      <div className="accounts-summary" style={{ marginTop: '24px' }}>
        <h3>Record Payment</h3>
        <form onSubmit={createPayment} className="accounts-form">
          <label htmlFor="payment-invoice" className="ui-input-label">Invoice</label>
          <select id="payment-invoice" className="ui-input-field" value={selectedInvoice} onChange={(e) => setSelectedInvoice(e.target.value)}>
            <option value="">Select invoice</option>
            {invoices.map((invoice) => (
              <option key={invoice.id} value={invoice.id}>{invoice.invoice_number} - {invoice.status}</option>
            ))}
          </select>
          <Input id="payment-amount" label="Amount" type="number" value={paymentForm.amount} onChange={(e) => setPaymentForm({ ...paymentForm, amount: Number(e.target.value) })} />
          <Input id="payment-reference" label="Reference" value={paymentForm.reference} onChange={(e) => setPaymentForm({ ...paymentForm, reference: e.target.value })} />
          <Button type="submit">Record Payment</Button>
        </form>
      </div>
    </div>
  )
}

export default ARPage
