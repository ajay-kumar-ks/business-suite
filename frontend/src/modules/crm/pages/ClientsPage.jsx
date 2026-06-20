import React, { useEffect, useState } from 'react'
import { Plus, Trash2, Search, Edit2 } from 'lucide-react'
import Button from '../../../components/ui/Button'
import Input from '../../../components/ui/Input'
import Select from '../../../components/ui/Select'
import Loader from '../../../components/ui/Loader'
import { crmAPI } from '../../../services/api'
import '../styles/LeadsView.css'
import '../styles/ContactForm.css'

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
      Standard: 'var(--text-secondary, #6b7280)',
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
      <div className="loading-state">
        <Loader size={32} />
        <span>Loading clients...</span>
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
        <Button
          className="btn-icon"
          onClick={() => setShowForm(true)}
          data-tooltip="Add Client"
          aria-label="Add Client"
        >
          <Plus size={20} />
        </Button>
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

        <Select
          value={filterTier}
          onChange={(e) => setFilterTier(e.target.value)}
          options={[
            { value: '', label: 'All Tiers' },
            { value: 'Standard', label: 'Standard' },
            { value: 'Premium', label: 'Premium' },
            { value: 'VIP', label: 'VIP' },
          ]}
        />

        <Select
          value={filterStatus}
          onChange={(e) => setFilterStatus(e.target.value)}
          options={[
            { value: '', label: 'All Status' },
            { value: 'Active', label: 'Active' },
            { value: 'Inactive', label: 'Inactive' },
            { value: 'Churned', label: 'Churned' },
          ]}
        />
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
          <div className="loading-state" style={{ marginTop: 12 }}>
            <Loader size={28} />
            <span>Loading client details...</span>
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
                    className="status-pill"
                    style={{
                      backgroundColor: getTierColor(client.tier),
                      color: 'white',
                    }}
                  >
                    {client.tier}
                  </span>
                </div>
                <div style={{ flex: 1 }}>
                  <span
                    className="status-pill"
                    style={{
                      backgroundColor: getStatusColor(client.status),
                      color: 'white',
                    }}
                  >
                    {client.status}
                  </span>
                </div>
                <div style={{ flex: 1 }}>
                  {lead ? (
                    <span className="status-pill" style={{ backgroundColor: '#e0e7ff', color: '#4f46e5' }} title={`Converted from lead: ${lead.title}`}>
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
const modalTextareaStyle = {
  width: '100%',
  padding: '12px 14px',
  border: '1px solid var(--border)',
  borderRadius: '8px',
  background: 'var(--sidebar)',
  color: 'var(--text)',
  minHeight: '80px',
  fontFamily: 'inherit',
  resize: 'vertical',
  fontSize: '0.95rem',
  transition: 'border-color 0.2s ease, box-shadow 0.2s ease',
}

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
    <div className="modal-overlay" role="dialog" aria-modal="true">
      <div className="lead-detail-modal" style={{ maxWidth: 600 }}>
        <div className="lead-detail-header">
          <div>
            <h3>{contact?.name || 'Client'}</h3>
            {lead && (
              <p className="lead-detail-status">
                Converted from lead: <strong>{lead.title}</strong>
              </p>
            )}
          </div>
          <button className="close-btn" type="button" onClick={onClose} aria-label="Close">
            ×
          </button>
        </div>

        <form onSubmit={handleSubmit}>
          <div className="lead-detail-grid">
            <div className="form-row">
              <Select
                label="Tier"
                value={formData.tier}
                onChange={(e) => setFormData({ ...formData, tier: e.target.value })}
                options={[
                  { value: 'Standard', label: 'Standard' },
                  { value: 'Premium', label: 'Premium' },
                  { value: 'VIP', label: 'VIP' },
                ]}
              />
            </div>

            <div className="form-row">
              <Select
                label="Status"
                value={formData.status}
                onChange={(e) => setFormData({ ...formData, status: e.target.value })}
                options={[
                  { value: 'Active', label: 'Active' },
                  { value: 'Inactive', label: 'Inactive' },
                  { value: 'Churned', label: 'Churned' },
                ]}
              />
            </div>

            <Input
              label="Account Manager"
              value={formData.account_manager}
              onChange={(e) => setFormData({ ...formData, account_manager: e.target.value })}
              placeholder="Enter account manager name"
            />

            <Input
              label="Renewal Date"
              type="date"
              value={formData.renewal_date}
              onChange={(e) => setFormData({ ...formData, renewal_date: e.target.value })}
            />

            <Input
              label="Subscription Value"
              type="number"
              value={formData.subscription_value}
              onChange={(e) => setFormData({ ...formData, subscription_value: Number(e.target.value) })}
              placeholder="Enter subscription value"
            />
          </div>

          <div className="form-row" style={{ marginBottom: 16 }}>
            <label className="custom-select-label">Pinned Notes</label>
            <textarea
              value={formData.pinned_notes}
              onChange={(e) => setFormData({ ...formData, pinned_notes: e.target.value })}
              placeholder="Important notes about this client"
              style={modalTextareaStyle}
            />
          </div>

          <div className="form-actions">
            <Button type="button" variant="ghost" onClick={onClose}>
              Cancel
            </Button>
            <Button type="submit" disabled={loading}>
              {loading ? 'Saving...' : 'Save Changes'}
            </Button>
          </div>
        </form>
      </div>
    </div>
  )
}

export default ClientsPage
