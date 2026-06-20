import React, { useState, useEffect } from 'react'
import { Search, Plus, Filter, MoreVertical, Trash2, Archive, Edit, ArrowRight } from 'lucide-react'
import Button from '../../../components/ui/Button'
import Select from '../../../components/ui/Select'
import Loader from '../../../components/ui/Loader'
import '../styles/ContactList.css'

const ContactList = ({ onSelectContact, onCreateContact, onConvertContact }) => {
  const [contacts, setContacts] = useState([])
  const [loading, setLoading] = useState(true)
  const [selectedContactLoading, setSelectedContactLoading] = useState(null)
  const [searchTerm, setSearchTerm] = useState('')
  const [filterTags, setFilterTags] = useState([])
  const [contactStatusFilter, setContactStatusFilter] = useState('all')
  const [page, setPage] = useState(0)
  const [totalContacts, setTotalContacts] = useState(0)
  const [selectedContacts, setSelectedContacts] = useState([])
  const [showMenu, setShowMenu] = useState(null)

  useEffect(() => {
    fetchContacts()
  }, [searchTerm, filterTags, contactStatusFilter, page])

  const fetchContacts = async () => {
    setLoading(true)
    try {
      const pageSize = 10
      let url = `/api/crm/contacts/?status=${contactStatusFilter}&skip=${page * pageSize}&limit=${pageSize}`
      if (searchTerm) url += `&search=${searchTerm}`
      if (filterTags.length > 0) url += `&tags=${filterTags.join(',')}`
      
      const response = await fetch(url)
      const data = await response.json()
      const total = Number(response.headers.get('x-total-count') || '0')
      setTotalContacts(total)
      setContacts(data)
    } catch (error) {
      console.error('Failed to fetch contacts:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleSelectAll = (e) => {
    if (e.target.checked) {
      setSelectedContacts(contacts.map(c => c.id))
    } else {
      setSelectedContacts([])
    }
  }

  const handleSelectContact = (id) => {
    setSelectedContacts(prev =>
      prev.includes(id) ? prev.filter(c => c !== id) : [...prev, id]
    )
  }

  const handleContactClick = async (id) => {
    setSelectedContactLoading(id)
    await onSelectContact(id)
    setSelectedContactLoading(null)
  }

  const handleDeleteContact = async (id) => {
    if (window.confirm('Are you sure you want to delete this contact?')) {
      try {
          await fetch(`/api/crm/contacts/${id}`, { method: 'DELETE' })
        setContacts(contacts.filter(c => c.id !== id))
      } catch (error) {
        console.error('Failed to delete contact:', error)
      }
    }
  }

  const handleArchiveContact = async (id) => {
    try {
        await fetch(`/api/crm/contacts/${id}/archive`, { method: 'PATCH' })
      setContacts(contacts.filter(c => c.id !== id))
    } catch (error) {
      console.error('Failed to archive contact:', error)
    }
  }

  const handleRestoreContact = async (id) => {
    try {
        await fetch(`/api/crm/contacts/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: 'active' }),
      })
      setContacts(contacts.filter(c => c.id !== id))
    } catch (error) {
      console.error('Failed to restore contact:', error)
    }
  }

  return (
    <div className="contact-list-container">
      <div className="contact-list-header">
        <div className="contact-search">
          <Search size={16} />
          <input
            type="text"
            placeholder="Search contacts by name, email, phone..."
            value={searchTerm}
            onChange={(e) => {
              setSearchTerm(e.target.value)
              setPage(0)
            }}
          />
        </div>
        <div className="contact-filter-group">
          <Select
            label="Status"
            value={contactStatusFilter}
            onChange={(e) => {
              setContactStatusFilter(e.target.value)
              setPage(0)
            }}
            options={[
              { value: 'active', label: 'Active' },
              { value: 'archived', label: 'Archived' },
              { value: 'deleted', label: 'Deleted' },
              { value: 'all', label: 'All' },
            ]}
          />
        </div>
        <Button
          onClick={onCreateContact}
          className="btn-icon new-contact-btn"
          data-tooltip="New Contact"
          aria-label="New Contact"
        >
          <Plus size={18} />
        </Button>
      </div>

      {loading ? (
        <div className="loading-state">
          <Loader size={28} />
          <span>Loading contacts...</span>
        </div>
      ) : contacts.length === 0 ? (
        <div className="empty-state">
          <p>No contacts found. Create your first contact to get started.</p>
          <Button onClick={onCreateContact} className="btn-primary">
            Create Contact
          </Button>
        </div>
      ) : (
        <>
          <div className="contact-list-table">
            <table>
            <thead>
              <tr>
                <th>
                  <input
                    type="checkbox"
                    checked={selectedContacts.length === contacts.length}
                    onChange={handleSelectAll}
                  />
                </th>
                <th>Name</th>
                <th>Email</th>
                <th>Phone</th>
                <th>Company</th>
                <th>Status</th>
                <th>Tags</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {contacts.map(contact => (
                <tr
                  key={contact.id}
                  className={selectedContacts.includes(contact.id) ? 'selected' : ''}
                  onClick={() => handleContactClick(contact.id)}
                >
                  <td>
                    <input
                      type="checkbox"
                      checked={selectedContacts.includes(contact.id)}
                      onClick={(e) => e.stopPropagation()}
                      onChange={() => handleSelectContact(contact.id)}
                    />
                  </td>
                  <td className="contact-name">
                    <div className="avatar">{contact.name.charAt(0).toUpperCase()}</div>
                    {selectedContactLoading === contact.id ? (
                      <Loader size={14} />
                    ) : (
                      <span>{contact.name}</span>
                    )}
                  </td>
                  <td>{contact.email || '-'}</td>
                  <td>{contact.phone || '-'}</td>
                  <td>{contact.company || '-'}</td>
                  <td className={`status-pill status-${contact.status || 'active'}`}>
                    {contact.status || 'active'}
                  </td>
                  <td>
                    <div className="tag-list">
                      {contact.tags && contact.tags.map(tag => (
                        <span key={tag.id} className="tag">{tag.name}</span>
                      ))}
                    </div>
                  </td>
                  <td className="actions">
                    <button
                      className="action-btn action-edit"
                      onClick={(e) => {
                        e.stopPropagation()
                        handleContactClick(contact.id)
                      }}
                      disabled={selectedContactLoading === contact.id}
                      data-tooltip="View Contact"
                      aria-label="View Contact"
                    >
                      <Edit size={16} />
                    </button>
                    {contact.status === 'deleted' ? (
                      <button
                        className="action-btn action-restore"
                        onClick={(e) => {
                          e.stopPropagation()
                          handleRestoreContact(contact.id)
                        }}
                        data-tooltip="Restore Contact"
                        aria-label="Restore Contact"
                      >
                        ↺
                      </button>
                    ) : (
                      <> 
                        {contact.status === 'archived' ? (
                          <button
                            className="action-btn action-restore"
                            onClick={(e) => {
                              e.stopPropagation()
                              handleRestoreContact(contact.id)
                            }}
                            data-tooltip="Restore Contact"
                            aria-label="Restore Contact"
                          >
                            ↺
                          </button>
                        ) : (
                          <button
                            className="action-btn action-archive"
                            onClick={(e) => {
                              e.stopPropagation()
                              handleArchiveContact(contact.id)
                            }}
                            data-tooltip="Archive Contact"
                            aria-label="Archive Contact"
                          >
                            <Archive size={16} />
                          </button>
                        )}
                        <button
                          className="action-btn action-delete"
                          onClick={(e) => {
                            e.stopPropagation()
                            handleDeleteContact(contact.id)
                          }}
                          data-tooltip="Delete Contact"
                          aria-label="Delete Contact"
                        >
                          <Trash2 size={16} />
                        </button>
                      </>
                    )}
                    {onConvertContact && contact.status !== 'deleted' && (
                      <button
                        className="action-btn action-convert"
                        onClick={(e) => {
                          e.stopPropagation()
                          onConvertContact(contact)
                        }}
                        data-tooltip="Convert to Lead"
                        aria-label="Convert to Lead"
                      >
                        <ArrowRight size={16} />
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
          <div className="contact-pagination">
            <Button
              type="button"
              variant="ghost"
              size="sm"
              disabled={page === 0}
              onClick={() => setPage((prev) => Math.max(prev - 1, 0))}
            >
              Previous
            </Button>
            <span>Page {page + 1} of {Math.max(1, Math.ceil(totalContacts / 10))}</span>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              disabled={(page + 1) * 10 >= totalContacts}
              onClick={() => setPage((prev) => prev + 1)}
            >
              Next
            </Button>
          </div>
        </>
      )}
    </div>
  )
}

export default ContactList
