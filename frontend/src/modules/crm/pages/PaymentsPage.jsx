import React, { useState, useEffect, useCallback } from 'react'
import { CreditCard, CheckCircle, XCircle, Clock, RefreshCw, IndianRupee } from 'lucide-react'
import api from '../../../services/api'

const PAYMENT_STATUS_CONFIG = {
  paid: { label: 'Paid', color: '#22c55e', icon: CheckCircle },
  created: { label: 'Created', color: '#3b82f6', icon: Clock },
  failed: { label: 'Failed', color: '#ef4444', icon: XCircle },
  attempted: { label: 'Attempted', color: '#f59e0b', icon: Clock },
  refunded: { label: 'Refunded', color: '#8b5cf6', icon: RefreshCw },
}

// Load Razorpay Checkout script dynamically
const loadRazorpayScript = () => {
  return new Promise((resolve) => {
    if (window.Razorpay) {
      resolve(true)
      return
    }
    const script = document.createElement('script')
    script.src = 'https://checkout.razorpay.com/v1/checkout.js'
    script.onload = () => resolve(true)
    script.onerror = () => {
      console.error('Failed to load Razorpay SDK')
      resolve(false)
    }
    document.body.appendChild(script)
  })
}

const PaymentsPage = () => {
  const [payments, setPayments] = useState([])
  const [loading, setLoading] = useState(true)
  const [processing, setProcessing] = useState(false)
  const [formData, setFormData] = useState({
    amount: '',
    customer_name: '',
    customer_email: '',
    customer_phone: '',
    description: '',
  })

  const fetchPayments = useCallback(async () => {
    try {
      setLoading(true)
      const res = await api.get('/payments/')
      setPayments(res.data.payments || [])
    } catch (err) {
      console.error('Failed to fetch payments:', err)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchPayments()
    loadRazorpayScript()
  }, [fetchPayments])

  const handlePayment = async (e) => {
    e.preventDefault()

    const amountInPaise = Math.round(parseFloat(formData.amount) * 100)
    if (!amountInPaise || amountInPaise < 100) {
      alert('Please enter a valid amount (minimum ₹1)')
      return
    }

    setProcessing(true)
    try {
      // 1. Create order on backend
      const orderRes = await api.post('/payments/create-order', {
        amount: amountInPaise,
        currency: 'INR',
        customer_name: formData.customer_name,
        customer_email: formData.customer_email,
        customer_phone: formData.customer_phone,
        description: formData.description,
      })

      const { razorpay_order_id, amount, key_id } = orderRes.data

      // 2. Verify script loaded
      const loaded = await loadRazorpayScript()
      if (!loaded) {
        alert('Failed to load payment gateway. Please refresh and try again.')
        setProcessing(false)
        return
      }

      // 3. Open Razorpay Checkout
      const options = {
        key: key_id,
        amount: amount,
        currency: 'INR',
        name: 'Business Suite',
        description: formData.description || 'Payment',
        order_id: razorpay_order_id,
        prefill: {
          name: formData.customer_name || '',
          email: formData.customer_email || '',
          contact: formData.customer_phone || '',
        },
        theme: {
          color: '#3b82f6',
        },
        handler: async function (response) {
          // 4. Verify payment on backend
          try {
            const verifyRes = await api.post('/payments/verify', {
              razorpay_order_id: response.razorpay_order_id,
              razorpay_payment_id: response.razorpay_payment_id,
              razorpay_signature: response.razorpay_signature,
            })

            if (verifyRes.data.success) {
              alert('Payment successful!')
              setFormData({ amount: '', customer_name: '', customer_email: '', customer_phone: '', description: '' })
              setProcessing(false)
              fetchPayments()
            }
          } catch (err) {
            const msg = err?.response?.data?.detail || 'Payment verification failed'
            alert(msg)
            setProcessing(false)
            fetchPayments()
          }
        },
        modal: {
          ondismiss: function () {
            setProcessing(false)
            fetchPayments()
          },
        },
      }

      const rzp = new window.Razorpay(options)
      rzp.on('payment.failed', async function (response) {
        alert(`Payment failed: ${response.error.description}`)
        // Notify backend to mark payment as failed
        try {
          await api.post('/payments/fail', {
            razorpay_order_id: response.error.order_id,
            razorpay_payment_id: response.error.payment_id || '',
          })
        } catch (err) {
          console.error('Failed to update payment status:', err)
        }
        setProcessing(false)
        fetchPayments()
      })
      rzp.open()
    } catch (err) {
      const msg = err?.response?.data?.detail || 'Failed to initiate payment'
      alert(msg)
      setProcessing(false)
    }
  }

  const formatAmount = (paise) => {
    return (paise / 100).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
  }

  const getStatusConfig = (status) => {
    return PAYMENT_STATUS_CONFIG[status] || { label: status, color: '#6b7280', icon: Clock }
  }

  return (
    <div className="payments-page" style={{ display: 'flex', flexDirection: 'column', gap: '24px', width: '100%' }}>
      {/* Header */}
      <div>
        <h2 style={{ margin: 0, fontSize: '22px', color: 'var(--text)', display: 'flex', alignItems: 'center', gap: '10px' }}>
          <CreditCard size={22} />
          Payment Gateway
        </h2>
        <p style={{ margin: '6px 0 0', fontSize: '14px', color: 'var(--text)', opacity: 0.6 }}>
          Make test payments using Razorpay
        </p>
      </div>

      {/* Payment Form */}
      <div style={{
        background: 'var(--sidebar)',
        border: '1px solid var(--border)',
        borderRadius: '12px',
        padding: '24px',
      }}>
        <h3 style={{ margin: '0 0 16px', fontSize: '16px', fontWeight: 600, color: 'var(--text)' }}>
          Make a Payment
        </h3>
        <form onSubmit={handlePayment} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px' }}>
            <div>
              <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, color: 'var(--text)', marginBottom: '6px', opacity: 0.7 }}>
                Amount (₹)
              </label>
              <input
                type="number"
                step="0.01"
                min="1"
                required
                placeholder="e.g. 100"
                value={formData.amount}
                onChange={(e) => setFormData({ ...formData, amount: e.target.value })}
                style={{
                  width: '100%',
                  padding: '10px 14px',
                  borderRadius: '8px',
                  border: '1px solid var(--border)',
                  background: 'var(--bg)',
                  color: 'var(--text)',
                  fontSize: '14px',
                  outline: 'none',
                  fontFamily: 'inherit',
                  boxSizing: 'border-box',
                }}
              />
            </div>
            <div>
              <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, color: 'var(--text)', marginBottom: '6px', opacity: 0.7 }}>
                Customer Name
              </label>
              <input
                type="text"
                placeholder="John Doe"
                value={formData.customer_name}
                onChange={(e) => setFormData({ ...formData, customer_name: e.target.value })}
                style={{
                  width: '100%',
                  padding: '10px 14px',
                  borderRadius: '8px',
                  border: '1px solid var(--border)',
                  background: 'var(--bg)',
                  color: 'var(--text)',
                  fontSize: '14px',
                  outline: 'none',
                  fontFamily: 'inherit',
                  boxSizing: 'border-box',
                }}
              />
            </div>
            <div>
              <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, color: 'var(--text)', marginBottom: '6px', opacity: 0.7 }}>
                Email
              </label>
              <input
                type="email"
                placeholder="john@example.com"
                value={formData.customer_email}
                onChange={(e) => setFormData({ ...formData, customer_email: e.target.value })}
                style={{
                  width: '100%',
                  padding: '10px 14px',
                  borderRadius: '8px',
                  border: '1px solid var(--border)',
                  background: 'var(--bg)',
                  color: 'var(--text)',
                  fontSize: '14px',
                  outline: 'none',
                  fontFamily: 'inherit',
                  boxSizing: 'border-box',
                }}
              />
            </div>
            <div>
              <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, color: 'var(--text)', marginBottom: '6px', opacity: 0.7 }}>
                Phone
              </label>
              <input
                type="tel"
                placeholder="+91 9876543210"
                value={formData.customer_phone}
                onChange={(e) => setFormData({ ...formData, customer_phone: e.target.value })}
                style={{
                  width: '100%',
                  padding: '10px 14px',
                  borderRadius: '8px',
                  border: '1px solid var(--border)',
                  background: 'var(--bg)',
                  color: 'var(--text)',
                  fontSize: '14px',
                  outline: 'none',
                  fontFamily: 'inherit',
                  boxSizing: 'border-box',
                }}
              />
            </div>
          </div>
          <div>
            <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, color: 'var(--text)', marginBottom: '6px', opacity: 0.7 }}>
              Description
            </label>
            <input
              type="text"
              placeholder="Payment for..."
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              style={{
                width: '100%',
                padding: '10px 14px',
                borderRadius: '8px',
                border: '1px solid var(--border)',
                background: 'var(--bg)',
                color: 'var(--text)',
                fontSize: '14px',
                outline: 'none',
                fontFamily: 'inherit',
                boxSizing: 'border-box',
              }}
            />
          </div>
          <button
            type="submit"
            disabled={processing}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '8px',
              padding: '12px 24px',
              background: processing ? 'var(--border)' : '#3b82f6',
              color: '#fff',
              border: 'none',
              borderRadius: '8px',
              fontSize: '14px',
              fontWeight: 600,
              cursor: processing ? 'not-allowed' : 'pointer',
              transition: 'all 0.15s ease',
              fontFamily: 'inherit',
              width: 'fit-content',
            }}
          >
            <CreditCard size={16} />
            {processing ? 'Processing...' : 'Pay with Razorpay'}
          </button>
        </form>
      </div>

      {/* Payment History */}
      <div style={{
        background: 'var(--sidebar)',
        border: '1px solid var(--border)',
        borderRadius: '12px',
        overflow: 'hidden',
      }}>
        <div style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          padding: '16px 20px',
          borderBottom: '1px solid var(--border)',
        }}>
          <h3 style={{ margin: 0, fontSize: '16px', fontWeight: 600, color: 'var(--text)' }}>
            Payment History
          </h3>
          <button
            onClick={fetchPayments}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '6px',
              padding: '8px 14px',
              borderRadius: '8px',
              border: '1px solid var(--border)',
              background: 'transparent',
              color: 'var(--text)',
              fontSize: '13px',
              cursor: 'pointer',
              fontFamily: 'inherit',
            }}
          >
            <RefreshCw size={14} />
            Refresh
          </button>
        </div>

        {loading ? (
          <div style={{ padding: '40px', textAlign: 'center', color: 'var(--text)', opacity: 0.5 }}>
            Loading payments...
          </div>
        ) : payments.length === 0 ? (
          <div style={{ padding: '40px', textAlign: 'center', color: 'var(--text)', opacity: 0.4 }}>
            <IndianRupee size={32} style={{ marginBottom: '8px', opacity: 0.3 }} />
            <div>No payments yet</div>
          </div>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px' }}>
              <thead>
                <tr style={{ borderBottom: '1px solid var(--border)', background: 'var(--bg)' }}>
                  <th style={{ padding: '12px 20px', textAlign: 'left', color: 'var(--text)', opacity: 0.6, fontWeight: 600, fontSize: '11px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Amount</th>
                  <th style={{ padding: '12px 20px', textAlign: 'left', color: 'var(--text)', opacity: 0.6, fontWeight: 600, fontSize: '11px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Customer</th>
                  <th style={{ padding: '12px 20px', textAlign: 'left', color: 'var(--text)', opacity: 0.6, fontWeight: 600, fontSize: '11px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Status</th>
                  <th style={{ padding: '12px 20px', textAlign: 'left', color: 'var(--text)', opacity: 0.6, fontWeight: 600, fontSize: '11px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Date</th>
                  <th style={{ padding: '12px 20px', textAlign: 'left', color: 'var(--text)', opacity: 0.6, fontWeight: 600, fontSize: '11px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Order ID</th>
                </tr>
              </thead>
              <tbody>
                {payments.map((payment) => {
                  const statusCfg = getStatusConfig(payment.status)
                  const StatusIcon = statusCfg.icon
                  return (
                    <tr key={payment.id} style={{ borderBottom: '1px solid var(--border)', transition: 'background 0.1s' }}>
                      <td style={{ padding: '14px 20px', fontWeight: 600, color: 'var(--text)' }}>
                        <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                          <IndianRupee size={12} />
                          {formatAmount(payment.amount)}
                        </span>
                      </td>
                      <td style={{ padding: '14px 20px', color: 'var(--text)' }}>
                        <div>{payment.customer_name || '—'}</div>
                        {payment.customer_email && (
                          <div style={{ fontSize: '12px', opacity: 0.5 }}>{payment.customer_email}</div>
                        )}
                      </td>
                      <td style={{ padding: '14px 20px' }}>
                        <span style={{
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: '6px',
                          padding: '4px 10px',
                          borderRadius: '20px',
                          fontSize: '12px',
                          fontWeight: 500,
                          background: `${statusCfg.color}15`,
                          color: statusCfg.color,
                        }}>
                          <StatusIcon size={12} />
                          {statusCfg.label}
                        </span>
                      </td>
                      <td style={{ padding: '14px 20px', color: 'var(--text)', opacity: 0.7, fontSize: '12px' }}>
                        {payment.created_at ? new Date(payment.created_at).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' }) : '—'}
                      </td>
                      <td style={{ padding: '14px 20px', color: 'var(--text)', opacity: 0.5, fontSize: '11px', fontFamily: 'monospace' }}>
                        {payment.razorpay_order_id}
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  )
}

export default PaymentsPage
