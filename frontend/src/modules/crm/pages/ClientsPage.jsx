import React, { useEffect, useState } from 'react'
import { Plus, Trash2, Search, Edit2, Mail, Phone } from 'lucide-react'
import Button from '../../../components/ui/Button'
import Loader from '../../../components/ui/Loader'
import { crmAPI } from '../../../services/api'
import '../styles/LeadsView.css'

const ClientsPage = () => {
  const [clients, setClients] = useState([])
  const [contacts, setContacts] = useState({})
  const [leads, setLeads] = useState({})
  const [loading, setLoading] = useState(true)
  const [tableLoading, setTableLoading] = useState(true)
  const [selectedClient, setSelectedClient] = useState(null)
  const [searchTerm, setSearchTerm] = useState('')
  const [filterTier, setFilterTier] = useState('')
  const [filterStatus, setFilterStatus] = useState('')
  const [showForm, setShowForm] = useState(false)

  useEffect(() => {
    fetchClients()
  }, [filterTier, filterStatus])

  const fetchClients = async () => {
    try {
      setLoading(true)
      setTableLoading(true)
      const params = {}
      if (filterTier) params.tier = filterTier
      if (filterStatus) params.status = filterStatus

      const response = await crmAPI.listClients(params)
      setClients(response.data)

      // Fetch contact info and lead info for each client
      const contactPromises = []
      const leadPromises = []

      for (const client of response.data) {
        if (client.contact_id && !contacts[client.contact_id]) {
          contactPromises.push(fetchContactInfo(client.contact_id))
        }
        if (client.lead_id && !leads[client.lead_id]) {
          leadPromises.push(fetchLeadInfo(client.lead_id))
        }
      }

      await Promise.all([...contactPromises, ...leadPromises])
    } catch (error) {
      console.error('Failed to fetch clients:', error)
    } finally {
      setLoading(false)
      setTableLoading(false)
    }
  }

  const fetchContactInfo = async (contactId) => {
    try {
      const response = await crmAPI.getContact(contactId)
      setContacts((prev) => ({ ...prev, [contactId]: response.data }))
    } catch (error) {
      console.error('Failed to fetch contact:', error)
    }
  }

  const fetchLeadInfo = async (leadId) => {
    try {
      const response = await crmAPI.getLead(leadId)
      setLeads((prev) => ({ ...prev, [leadId]: response.data }))
    } catch (error) {
      console.error('Failed to fetch lead:', error)
    }
  }

  const handleDelete = async (clientId) => {
    if (!window.confirm('Are you sure you want to delete this client?')) return
    try {
      await crmAPI.deleteClient(clientId)
      setClients(clients.filter((c) => c.id !== clientId))
    } catch (error) {
      console.error('Failed to delete client:', error)
    }
  }

  const getTierColor = (tier) => {
    const colors = {
      Standard: '#6b7280',
      Premium: '#f59e0b',
      VIP: '#ec4899',
    }
    return colors[tier] || colors.Standard
  }

  const getStatusColor = (status) => {
    const colors = {
      Active: '#22c55e',
      Inactive: '#9ca3af',
      Churned: '#ef4444',
    }
    return colors[status] || colors.Inactive
  }

  const filteredClients = clients.filter((client) => {
    const contact = contacts[client.contact_id]
    if (!contact) {
      return searchTerm.trim() === ''
    }
    return contact.name.toLowerCase().includes(searchTerm.toLowerCase())
  })

  if (loading && clients.length === 0) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '300px' }}>
        <Loader size={32} />
      </div>
    )
  }

  return (
    <div className="leads-page">
      <div className="leads-header">
        <div>
          <h1>Clients</h1>
          <p>Manage your customer relationships and accounts</p>
        </div>
        <button className="lead-add-btn" onClick={() => setShowForm(true)} data-tooltip="Add Client">
          <Plus size={20} />
        </button>
      </div>

      {/* Filters */}
      <div className="leads-filters">
        <div className="filter-input">
          <Search size={16} />
          <input
            type="text"
            placeholder="Search clients..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>

        <select
          className="filter-row"
          value={filterTier}
          onChange={(e) => setFilterTier(e.target.value)}
          style={{ padding: '8px 12px', border: '1px solid var(--border)', borderRadius: '8px' }}
        >
          <option value="">All Tiers</option>
          <option value="Standard">Standard</option>
          <option value="Premium">Premium</option>
          <option value="VIP">VIP</option>
        </select>

        <select
          className="filter-row"
          value={filterStatus}
          onChange={(e) => setFilterStatus(e.target.value)}
          style={{ padding: '8px 12px', border: '1px solid var(--border)', borderRadius: '8px' }}
        >
          <option value="">All Status</option>
          <option value="Active">Active</option>
          <option value="Inactive">Inactive</option>
          <option value="Churned">Churned</option>
        </select>
      </div>

      {/* Clients Table */}
      <div className="leads-table" style={{ position: 'relative' }}>
        <div className="leads-row header">
          <div style={{ flex: 2 }}>Client Name</div>
          <div style={{ flex: 1 }}>Tier</div>
          <div style={{ flex: 1 }}>Status</div>
          <div style={{ flex: 1 }}>From Lead</div>
          <div style={{ flex: 1 }}>Account Manager</div>
          <div style={{ flex: 0.8 }}>Actions</div>
        </div>

        {tableLoading && (
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              minHeight: '120px',
              background: 'rgba(255, 255, 255, 0.9)',
              borderRadius: '12px',
              marginTop: '12px',
            }}
          >
            <Loader size={28} />
            <span style={{ marginLeft: '10px', color: 'var(--text-secondary)' }}>
              Loading client details...
            </span>
          </div>
        )}

        {!tableLoading && filteredClients.length === 0 ? (
          <div className="empty-state">No clients found</div>
        ) : (
          filteredClients.map((client) => {
            const contact = contacts[client.contact_id]
            const lead = leads[client.lead_id]
            return (
              <div
                key={client.id}
                className="leads-row"
                onClick={() => setSelectedClient(client)}
                style={{ cursor: 'pointer' }}
              >
                <div style={{ flex: 2, fontWeight: 500 }}>{contact?.name || 'Unknown'}</div>
                <div style={{ flex: 1 }}>
                  <span
                    style={{
                      backgroundColor: getTierColor(client.tier),
                      color: 'white',
                      padding: '4px 8px',
                      borderRadius: '6px',
                      fontSize: '0.85rem',
                    }}
                  >
                    {client.tier}
                  </span>
                </div>
                <div style={{ flex: 1 }}>
                  <span
                    style={{
                      backgroundColor: getStatusColor(client.status),
                      color: 'white',
                      padding: '4px 8px',
                      borderRadius: '6px',
                      fontSize: '0.85rem',
                    }}
                  >
                    {client.status}
                  </span>
                </div>
                <div style={{ flex: 1 }}>
                  {lead ? (
                    <span
                      style={{
                        backgroundColor: '#e0e7ff',
                        color: '#4f46e5',
                        padding: '4px 8px',
                        borderRadius: '6px',
                        fontSize: '0.85rem',
                        fontWeight: 500,
                      }}
                      title={`Converted from lead: ${lead.title}`}
                    >
                      {lead.title}
                    </span>
                  ) : (
                    <span style={{ color: 'var(--text-secondary)', fontSize: '0.85rem' }}>Direct</span>
                  )}
                </div>
                <div style={{ flex: 1 }}>{client.account_manager || '—'}</div>
                <div style={{ flex: 0.8, display: 'flex', gap: '6px' }}>
                  <button
                    className="action-btn"
                    onClick={(e) => {
                      e.stopPropagation()
                      setSelectedClient(client)
                    }}
                    title="View details"
                  >
                    <Edit2 size={14} />
                  </button>
                  <button
                    className="action-btn action-delete"
                    onClick={(e) => {
                      e.stopPropagation()
                      handleDelete(client.id)
                    }}
                    title="Delete"
                  >
                    <Trash2 size={14} />
                  </button>
                </div>
              </div>
            )
          })
        )}
      </div>

      {/* Client Detail Modal */}
      {selectedClient && (
        <ClientDetailModal
          client={selectedClient}
          contact={contacts[selectedClient.contact_id]}
          onClose={() => setSelectedClient(null)}
          onUpdate={() => {
            fetchClients()
            setSelectedClient(null)
          }}
        />
      )}
    </div>
  )
}

// Client Detail Modal Component
const ClientDetailModal = ({ client, contact, onClose, onUpdate }) => {
  const [leads, setLeads] = useState({})
  const [formData, setFormData] = useState({
    tier: client.tier || 'Standard',
    status: client.status || 'Active',
    account_manager: client.account_manager || '',
    renewal_date: client.renewal_date || '',
    subscription_value: client.subscription_value || '',
    pinned_notes: client.pinned_notes || '',
  })
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    if (client.lead_id) {
      fetchLeadInfo()
    }
  }, [client.lead_id])

  const fetchLeadInfo = async () => {
    try {
      const response = await crmAPI.getLead(client.lead_id)
      setLeads((prev) => ({ ...prev, [client.lead_id]: response.data }))
    } catch (error) {
      console.error('Failed to fetch lead:', error)
    }
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    setLoading(true)
    try {
      await crmAPI.updateClient(client.id, formData)
      onUpdate()
    } catch (error) {
      console.error('Failed to update client:', error)
    } finally {
      setLoading(false)
    }
  }

  const lead = leads[client.lead_id]

  return (
    <div style={{ position: 'fixed', inset: 0, backgroundColor: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 100 }}>
      <div style={{ backgroundColor: 'var(--sidebar)', borderRadius: '16px', padding: '24px', maxWidth: '600px', width: '90%', maxHeight: '80vh', overflowY: 'auto' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
          <div>
            <h2 style={{ margin: '0 0 8px 0' }}>{contact?.name || 'Client'}</h2>
            {lead && (
              <p style={{ margin: 0, fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
                Converted from lead: <strong>{lead.title}</strong>
              </p>
            )}
          </div>
          <button
            onClick={onClose}
            style={{ background: 'transparent', border: 'none', fontSize: '24px', cursor: 'pointer', color: 'var(--text)' }}
          >
            ×
          </button>
        </div>

        <form onSubmit={handleSubmit}>
          <div style={{ marginBottom: '16px' }}>
            <label style={{ display: 'block', marginBottom: '6px', fontSize: '0.9rem', fontWeight: 600 }}>Tier</label>
            <select
              value={formData.tier}
              onChange={(e) => setFormData({ ...formData, tier: e.target.value })}
              style={{ width: '100%', padding: '8px 12px', border: '1px solid var(--border)', borderRadius: '8px' }}
            >
              <option value="Standard">Standard</option>
              <option value="Premium">Premium</option>
              <option value="VIP">VIP</option>
            </select>
          </div>

          <div style={{ marginBottom: '16px' }}>
            <label style={{ display: 'block', marginBottom: '6px', fontSize: '0.9rem', fontWeight: 600 }}>Status</label>
            <select
              value={formData.status}
              onChange={(e) => setFormData({ ...formData, status: e.target.value })}
              style={{ width: '100%', padding: '8px 12px', border: '1px solid var(--border)', borderRadius: '8px' }}
            >
              <option value="Active">Active</option>
              <option value="Inactive">Inactive</option>
              <option value="Churned">Churned</option>
            </select>
          </div>

          <div style={{ marginBottom: '16px' }}>
            <label style={{ display: 'block', marginBottom: '6px', fontSize: '0.9rem', fontWeight: 600 }}>Account Manager</label>
            <input
              type="text"
              value={formData.account_manager}
              onChange={(e) => setFormData({ ...formData, account_manager: e.target.value })}
              placeholder="Enter account manager name"
              style={{ width: '100%', padding: '8px 12px', border: '1px solid var(--border)', borderRadius: '8px' }}
            />
          </div>

          <div style={{ marginBottom: '16px' }}>
            <label style={{ display: 'block', marginBottom: '6px', fontSize: '0.9rem', fontWeight: 600 }}>Renewal Date</label>
            <input
              type="date"
              value={formData.renewal_date}
              onChange={(e) => setFormData({ ...formData, renewal_date: e.target.value })}
              style={{ width: '100%', padding: '8px 12px', border: '1px solid var(--border)', borderRadius: '8px' }}
            />
          </div>

          <div style={{ marginBottom: '16px' }}>
            <label style={{ display: 'block', marginBottom: '6px', fontSize: '0.9rem', fontWeight: 600 }}>Subscription Value</label>
            <input
              type="number"
              value={formData.subscription_value}
              onChange={(e) => setFormData({ ...formData, subscription_value: Number(e.target.value) })}
              placeholder="Enter subscription value"
              style={{ width: '100%', padding: '8px 12px', border: '1px solid var(--border)', borderRadius: '8px' }}
            />
          </div>

          <div style={{ marginBottom: '16px' }}>
            <label style={{ display: 'block', marginBottom: '6px', fontSize: '0.9rem', fontWeight: 600 }}>Pinned Notes</label>
            <textarea
              value={formData.pinned_notes}
              onChange={(e) => setFormData({ ...formData, pinned_notes: e.target.value })}
              placeholder="Important notes about this client"
              style={{ width: '100%', padding: '8px 12px', border: '1px solid var(--border)', borderRadius: '8px', minHeight: '80px', fontFamily: 'inherit' }}
            />
          </div>

          <div style={{ display: 'flex', gap: '12px', justifyContent: 'flex-end' }}>
            <button
              type="button"
              onClick={onClose}
              style={{ padding: '8px 16px', border: '1px solid var(--border)', borderRadius: '8px', background: 'transparent', cursor: 'pointer' }}
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              style={{ padding: '8px 16px', background: 'var(--primary)', color: 'white', border: 'none', borderRadius: '8px', cursor: 'pointer' }}
            >
              {loading ? 'Saving...' : 'Save Changes'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

export default ClientsPage
