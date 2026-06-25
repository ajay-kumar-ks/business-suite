import React, { useState } from 'react'
import CRMViewTabs from '../components/CRMViewTabs'
import ContactList from '../components/ContactList'
import ContactForm from '../components/ContactForm'
import ActivityTimeline from '../components/ActivityTimeline'
import ActivitiesPage from './ActivitiesPage'
import LeadsPage from './LeadsPage'
import ClientsPage from './ClientsPage'
import PaymentsPage from './PaymentsPage'
import CRMAnalyticsDashboard from '../components/CRMAnalyticsDashboard'
import CRMChatBot from '../components/CRMChatBot'
import { crmAPI } from '../../../services/api'
import '../../../styles/ModulePage.css'
import '../styles/CRMPageLayout.css'
import '../styles/LeadsView.css'
import '../styles/CRMAnalyticsDashboard.css'
import '../styles/CRMChatBot.css'
import '../styles/PaymentsPage.css'

const CRMPage = () => {
  const [activeView, setActiveView] = useState('contacts')
  const [showContactForm, setShowContactForm] = useState(false)
  const [selectedContact, setSelectedContact] = useState(null)
  const [contactActivities, setContactActivities] = useState([])
  const [leadContactPrefill, setLeadContactPrefill] = useState(null)

  const handleSelectContact = async (contactId) => {
    try {
      const response = await crmAPI.getContact(contactId)
      const contact = response.data
      setSelectedContact(contact)
      setContactActivities(contact.activities || [])
    } catch (error) {
      console.error('Failed to fetch contact:', error)
    }
  }

  const handleSaveContact = (savedContact) => {
    setSelectedContact(savedContact)
    setShowContactForm(false)
    setContactActivities(savedContact.activities || [])
  }

  const handleActivityAdd = (newActivity) => {
    setContactActivities(prev => [newActivity, ...prev])
  }

  return (
    <div className="crm-page">
      <div className="crm-page-header">
        <div className="crm-header-left">
          <h1>CRM Workspace</h1>
          <CRMViewTabs activeView={activeView} setActiveView={setActiveView} />
        </div>
        <div className="crm-header-info">
          <p>Manage your contacts, leads, clients, and activities.</p>
        </div>
      </div>

      {activeView === 'contacts' && (
        <div className="crm-contacts-view">
          {!selectedContact && !showContactForm && (
            <ContactList
              onSelectContact={handleSelectContact}
              onCreateContact={() => {
                setSelectedContact(null)
                setShowContactForm(true)
              }}
              onConvertContact={(contact) => {
                setLeadContactPrefill(contact)
                setActiveView('leads')
              }}
            />
          )}

          {selectedContact && !showContactForm && (
            <div className="contact-detail-view">
              <button
                className="back-btn"
                onClick={() => {
                  setSelectedContact(null)
                  setContactActivities([])
                }}
              >
                ← Back to Contacts
              </button>

              <div className="contact-detail-grid">
                <div className="contact-info-card">
                  <h2>{selectedContact.name}</h2>

                  <div className="contact-details">
                    {selectedContact.email && (
                      <div className="detail-item">
                        <span className="label">Email:</span>
                        <a href={`mailto:${selectedContact.email}`}>{selectedContact.email}</a>
                      </div>
                    )}
                    {selectedContact.phone && (
                      <div className="detail-item">
                        <span className="label">Phone:</span>
                        <a href={`tel:${selectedContact.phone}`}>{selectedContact.phone}</a>
                      </div>
                    )}
                    {selectedContact.company && (
                      <div className="detail-item">
                        <span className="label">Company:</span>
                        <span>{selectedContact.company}</span>
                      </div>
                    )}
                    {selectedContact.job_title && (
                      <div className="detail-item">
                        <span className="label">Job Title:</span>
                        <span>{selectedContact.job_title}</span>
                      </div>
                    )}
                    {selectedContact.address && (
                      <div className="detail-item">
                        <span className="label">Address:</span>
                        <span>{selectedContact.address}</span>
                      </div>
                    )}
                    {selectedContact.notes && (
                      <div className="detail-item">
                        <span className="label">Notes:</span>
                        <span>{selectedContact.notes}</span>
                      </div>
                    )}
                  </div>

                  {selectedContact.custom_fields && selectedContact.custom_fields.length > 0 && (
                    <div className="custom-fields-display">
                      <h4>Additional Information</h4>
                      <div className="fields-list">
                        {selectedContact.custom_fields.map((field, idx) => (
                          <div key={idx} className="field-item">
                            <span className="field-label">{field.label}:</span>
                            <span className="field-value">{field.value}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {selectedContact.tags && selectedContact.tags.length > 0 && (
                    <div className="tags-section">
                      <h4>Tags</h4>
                      <div className="tag-list">
                        {selectedContact.tags.map(tag => (
                          <span key={tag.id} className="tag" style={{ backgroundColor: tag.color }}>
                            {tag.name}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}

                  <div className="button-group">
                    <button
                      className="edit-btn"
                      onClick={() => setShowContactForm(true)}
                    >
                      Edit Contact
                    </button>

                    <button
                      className="edit-btn secondary"
                      onClick={() => {
                        setLeadContactPrefill(selectedContact)
                        setActiveView('leads')
                      }}
                    >
                      Create Lead
                    </button>
                  </div>
                </div>

                <div className="activity-section">
                  <ActivityTimeline
                    contactId={selectedContact.id}
                    activities={contactActivities}
                    onActivityAdd={handleActivityAdd}
                  />
                </div>
              </div>
            </div>
          )}

          {showContactForm && (
            <div className="contact-form-modal" onClick={() => {
              setShowContactForm(false)
              setSelectedContact(null)
            }}>
              <div className="contact-form-dialog" onClick={(e) => e.stopPropagation()}>
                <ContactForm
                  contact={selectedContact}
                  onSave={handleSaveContact}
                  onCancel={() => {
                    setShowContactForm(false)
                    setSelectedContact(null)
                  }}
                />
              </div>
            </div>
          )}
        </div>
      )}

      {activeView === 'analytics' && (
        <CRMAnalyticsDashboard />
      )}

      {activeView === 'leads' && (
        <LeadsPage prefillContact={leadContactPrefill} />
      )}

      {activeView === 'clients' && (
        <ClientsPage />
      )}

      {activeView === 'activities' && (
        <ActivitiesPage />
      )}

      {activeView === 'payments' && (
        <PaymentsPage />
      )}

      {/* CRM Chatbot — only appears when CRM is open */}
      <CRMChatBot />
    </div>
  )
}

export default CRMPage
