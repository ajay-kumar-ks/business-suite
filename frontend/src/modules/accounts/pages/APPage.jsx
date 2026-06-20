import React, { useEffect, useState, useCallback } from 'react'
import '../../../styles/ModulePage.css'
import { accountsAPI } from '../../../services/api'
import { useAccountsPermissions, isPageAllowed } from '../accountsPermissions'
import Input from '../../../components/ui/Input'
import Button from '../../../components/ui/Button'

const APPage = () => {
  const { department, canPerformAction, loading } = useAccountsPermissions()
  if (loading) return <div className="module-page"><p>Loading...</p></div>
  if (!isPageAllowed(department, 'ap')) {
    return (
      <div className="module-page">
        <h2>Access Denied</h2>
        <p>You do not have permission to view Accounts Payable.</p>
      </div>
    )
  }
  const [vendors, setVendors] = useState([])
  const [bills, setBills] = useState([])
  const [vendorForm, setVendorForm] = useState({ name: '', email: '', phone: '', address: '' })
  const [billForm, setBillForm] = useState({ vendor_id: '', bill_number: '', amount: 0, description: '' })
  const [paymentForm, setPaymentForm] = useState({ amount: 0, reference: '' })
  const [selectedBill, setSelectedBill] = useState('')
  const [message, setMessage] = useState('')
  const [messageType, setMessageType] = useState('success')

  const loadData = useCallback(async () => {
    try {
      const [vendorResponse, billResponse] = await Promise.all([accountsAPI.listVendors(), accountsAPI.listBills()])
      setVendors(vendorResponse.data)
      setBills(billResponse.data)
    } catch (err) {
      setMessage('Failed to load AP data')
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

  const createVendor = async (e) => {
    e.preventDefault()
    try {
      await accountsAPI.createVendor(vendorForm)
      showMessage('Vendor created successfully!')
      setVendorForm({ name: '', email: '', phone: '', address: '' })
      loadData()
    } catch (err) {
      showMessage(err.response?.data?.detail || 'Unable to create vendor', 'error')
    }
  }

  const createBill = async (e) => {
    e.preventDefault()
    try {
      await accountsAPI.createBill(billForm)
      showMessage('Bill created successfully!')
      setBillForm({ vendor_id: '', bill_number: '', amount: 0, description: '' })
      loadData()
    } catch (err) {
      showMessage(err.response?.data?.detail || 'Unable to create bill', 'error')
    }
  }

  const createPayment = async (e) => {
    e.preventDefault()
    try {
      await accountsAPI.createBillPayment(selectedBill, {
        bill_id: Number(selectedBill),
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
      <h2>Accounts Payable</h2>
      <p>Manage vendors, bills, and vendor payments.</p>
      {message && <div className={messageType === 'error' ? 'error-message' : 'success-message'}>{message}</div>}

      <div className="accounts-summary">
        <h3>Vendors</h3>
        {canPerformAction('createVendor') ? (
          <details>
            <summary style={{ cursor: 'pointer', marginBottom: '10px', fontWeight: 600, color: 'var(--primary)' }}>+ Add New Vendor</summary>
            <form onSubmit={createVendor} className="accounts-form">
              <div className="form-row">
                <Input id="vendor-name" label="Name" value={vendorForm.name} onChange={(e) => setVendorForm({ ...vendorForm, name: e.target.value })} />
                <Input id="vendor-email" label="Email" value={vendorForm.email} onChange={(e) => setVendorForm({ ...vendorForm, email: e.target.value })} />
              </div>
              <div className="form-row">
                <Input id="vendor-phone" label="Phone" value={vendorForm.phone} onChange={(e) => setVendorForm({ ...vendorForm, phone: e.target.value })} />
                <Input id="vendor-address" label="Address" value={vendorForm.address} onChange={(e) => setVendorForm({ ...vendorForm, address: e.target.value })} />
              </div>
              <Button type="submit">Create Vendor</Button>
            </form>
          </details>
        ) : (
          <div className="permission-warning" style={{ padding: '14px', border: '1px solid #f59e0b', borderRadius: '8px', background: '#fffbeb' }}>
            You do not have permission to create vendors.
          </div>
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
            {vendors.length === 0 ? (
              <tr><td colSpan="4" className="empty-state">No vendors yet.</td></tr>
            ) : (
              vendors.map((v) => (
                <tr key={v.id}>
                  <td><strong>{v.name}</strong></td>
                  <td>{v.email || '—'}</td>
                  <td>{v.phone || '—'}</td>
                  <td><StatusBadge status={v.is_active === 'active' ? 'active' : 'draft'} /></td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      <div className="accounts-summary" style={{ marginTop: '20px' }}>
        <h3>Bills</h3>
        {canPerformAction('createBill') ? (
          <details>
            <summary style={{ cursor: 'pointer', marginBottom: '10px', fontWeight: 600, color: 'var(--primary)' }}>+ Create New Bill</summary>
            <form onSubmit={createBill} className="accounts-form">
              <div className="form-row">
                <div>
                  <label className="ui-input-label">Vendor</label>
                  <select className="ui-input-field" value={billForm.vendor_id} onChange={(e) => setBillForm({ ...billForm, vendor_id: Number(e.target.value) })}>
                    <option value="">Select vendor</option>
                    {vendors.map((vendor) => (
                      <option key={vendor.id} value={vendor.id}>{vendor.name}</option>
                    ))}
                  </select>
                </div>
                <Input id="bill-number" label="Bill Number" value={billForm.bill_number} onChange={(e) => setBillForm({ ...billForm, bill_number: e.target.value })} />
              </div>
              <div className="form-row">
                <Input id="bill-amount" label="Amount" type="number" value={billForm.amount} onChange={(e) => setBillForm({ ...billForm, amount: Number(e.target.value) })} />
                <Input id="bill-description" label="Description" value={billForm.description} onChange={(e) => setBillForm({ ...billForm, description: e.target.value })} />
              </div>
              <Button type="submit">Create Bill</Button>
            </form>
          </details>
        ) : (
          <div className="permission-warning" style={{ padding: '14px', border: '1px solid #f59e0b', borderRadius: '8px', background: '#fffbeb' }}>
            You do not have permission to create bills.
          </div>
        )}

        <table className="accounts-table">
          <thead>
            <tr>
              <th>Bill #</th>
              <th>Vendor</th>
              <th>Amount</th>
              <th>Paid</th>
              <th>Balance</th>
              <th>Status</th>
            </tr>
          </thead>
          <tbody>
            {bills.length === 0 ? (
              <tr><td colSpan="6" className="empty-state">No bills yet.</td></tr>
            ) : (
              bills.map((bill) => {
                const vendor = vendors.find(v => v.id === bill.vendor_id)
                const balance = Number(bill.amount) - Number(bill.paid_amount)
                return (
                  <tr key={bill.id}>
                    <td><strong>{bill.bill_number}</strong></td>
                    <td>{vendor?.name || `Vendor #${bill.vendor_id}`}</td>
                    <td>{formatCurrency(bill.amount)}</td>
                    <td>{formatCurrency(bill.paid_amount)}</td>
                    <td style={{ fontWeight: 700, color: balance > 0 ? '#f59e0b' : '#10b981' }}>{formatCurrency(balance)}</td>
                    <td><StatusBadge status={bill.status} /></td>
                  </tr>
                )
              })
            )}
          </tbody>
        </table>
      </div>

      <div className="accounts-summary" style={{ marginTop: '20px' }}>
        <h3>Record Payment</h3>
        {canPerformAction('createBillPayment') ? (
          <form onSubmit={createPayment} className="accounts-form">
            <div className="form-row">
              <div>
                <label className="ui-input-label">Bill</label>
                <select className="ui-input-field" value={selectedBill} onChange={(e) => setSelectedBill(e.target.value)}>
                  <option value="">Select bill</option>
                  {bills.map((bill) => (
                    <option key={bill.id} value={bill.id}>{bill.bill_number} - Balance: {formatCurrency(Number(bill.amount) - Number(bill.paid_amount))}</option>
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
            You do not have permission to record bill payments.
          </div>
        )}
      </div>
    </div>
  )
}

export default APPage
