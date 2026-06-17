import React from 'react'

const VIEW_TABS = [
  { id: 'contacts', label: 'Contacts' },
  { id: 'leads', label: 'Leads' },
  { id: 'clients', label: 'Clients' },
  { id: 'activities', label: 'Activities' },
  { id: 'settings', label: 'Settings' },
]

const CRMViewTabs = ({ activeView, setActiveView }) => {
  return (
    <div className="crm-tabs">
      {VIEW_TABS.map((tab) => (
        <button
          key={tab.id}
          type="button"
          className={`crm-tab ${activeView === tab.id ? 'active' : ''}`}
          onClick={() => setActiveView(tab.id)}
        >
          {tab.label}
        </button>
      ))}
    </div>
  )
}

export default CRMViewTabs
