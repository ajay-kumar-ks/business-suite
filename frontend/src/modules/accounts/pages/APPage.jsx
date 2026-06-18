import React, { useEffect, useState } from 'react'
import '../../../styles/ModulePage.css'
import { accountsAPI } from '../../../services/api'
import Input from '../../../components/ui/Input'
import Button from '../../../components/ui/Button'

const APPage = () => {
  const [vendors, setVendors] = useState([])
  const [bills, setBills] = useState([])
  const [vendorForm, setVendorForm] = useState({ name: '', email: '', phone: '', address: '' })
  const [billForm, setBillForm] = useState({ vendor_id: '', bill_number: '', amount: 0, description: '' })
  const [paymentForm, setPaymentForm] = useState({ amount: 0, reference: '' })
  const [selectedBill, setSelectedBill] = useState('')
  const [message, setMessage] = useState('')

  const loadData = async () => {
    try {
      const [vendorResponse, billResponse] = await Promise.all([accountsAPI.listVendors(), accountsAPI.listBills()])
      setVendors(vendorResponse.data)
      setBills(billResponse.data)
    } catch (err) {
      setMessage('Failed to load AP data')
    }
  }

  useEffect(() => {
    loadData()
  }, [])

  const createVendor = async (e) => {
    e.preventDefault()
    try {
      await accountsAPI.createVendor(vendorForm)
      setMessage('Vendor created')
      setVendorForm({ name: '', email: '', phone: '', address: '' })
      loadData()
    } catch (err) {
      setMessage(err.response?.data?.detail || 'Unable to create vendor')
    }
  }

  const createBill = async (e) => {
    e.preventDefault()
    try {
      await accountsAPI.createBill(billForm)
      setMessage('Bill created')
      setBillForm({ vendor_id: '', bill_number: '', amount: 0, description: '' })
      loadData()
    } catch (err) {
      setMessage(err.response?.data?.detail || 'Unable to create bill')
    }
  }

  const createPayment = async (e) => {
    e.preventDefault()
    try {
      await accountsAPI.createBillPayment(selectedBill, {
        bill_id: Number(selectedBill),
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
      <h2>Accounts Payable</h2>
      <p>Manage vendors, bills, and vendor payments.</p>
      {message && <div className="success-message">{message}</div>}

      <div className="accounts-summary">
        <h3>Create Vendor</h3>
        <form onSubmit={createVendor} className="accounts-form">
          <Input id="vendor-name" label="Name" value={vendorForm.name} onChange={(e) => setVendorForm({ ...vendorForm, name: e.target.value })} />
          <Input id="vendor-email" label="Email" value={vendorForm.email} onChange={(e) => setVendorForm({ ...vendorForm, email: e.target.value })} />
          <Input id="vendor-phone" label="Phone" value={vendorForm.phone} onChange={(e) => setVendorForm({ ...vendorForm, phone: e.target.value })} />
          <Input id="vendor-address" label="Address" value={vendorForm.address} onChange={(e) => setVendorForm({ ...vendorForm, address: e.target.value })} />
          <Button type="submit">Create Vendor</Button>
        </form>
      </div>

      <div className="accounts-summary" style={{ marginTop: '24px' }}>
        <h3>Create Bill</h3>
        <form onSubmit={createBill} className="accounts-form">
          <label htmlFor="bill-vendor" className="ui-input-label">Vendor</label>
          <select id="bill-vendor" className="ui-input-field" value={billForm.vendor_id} onChange={(e) => setBillForm({ ...billForm, vendor_id: Number(e.target.value) })}>
            <option value="">Select vendor</option>
            {vendors.map((vendor) => (
              <option key={vendor.id} value={vendor.id}>{vendor.name}</option>
            ))}
          </select>
          <Input id="bill-number" label="Bill Number" value={billForm.bill_number} onChange={(e) => setBillForm({ ...billForm, bill_number: e.target.value })} />
          <Input id="bill-amount" label="Amount" type="number" value={billForm.amount} onChange={(e) => setBillForm({ ...billForm, amount: Number(e.target.value) })} />
          <Input id="bill-description" label="Description" value={billForm.description} onChange={(e) => setBillForm({ ...billForm, description: e.target.value })} />
          <Button type="submit">Create Bill</Button>
        </form>
      </div>

      <div className="accounts-summary" style={{ marginTop: '24px' }}>
        <h3>Record Payment</h3>
        <form onSubmit={createPayment} className="accounts-form">
          <label htmlFor="payment-bill" className="ui-input-label">Bill</label>
          <select id="payment-bill" className="ui-input-field" value={selectedBill} onChange={(e) => setSelectedBill(e.target.value)}>
            <option value="">Select bill</option>
            {bills.map((bill) => (
              <option key={bill.id} value={bill.id}>{bill.bill_number} - {bill.status}</option>
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

export default APPage
