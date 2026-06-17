import React, { useState } from 'react'
import CRMViewTabs from '../components/CRMViewTabs'
import '../../../styles/ModulePage.css'
import '../styles/CRMPageLayout.css'

const CRMPage = () => {
  const [activeView, setActiveView] = useState('contacts')
  const [activeSection, setActiveSection] = useState('crmOverview')

  const sections = [
    { id: 'crmOverview', label: 'Overview' },
    { id: 'crmReports', label: 'Reports' },
    { id: 'crmGoals', label: 'Goals' },
  ]

  return (
    <div className="crm-page">
      <aside className="crm-sidebar">
        <h2>CRM Menu</h2>
        <div className="crm-sidebar-nav">
          {sections.map((section) => (
            <button
              key={section.id}
              type="button"
              className={`crm-sidebar-button ${activeSection === section.id ? 'active' : ''}`}
              onClick={() => setActiveSection(section.id)}
            >
              {section.label}
            </button>
          ))}
        </div>
      </aside>

      <main className="crm-main">
        <div className="crm-page-header">
          <div>
            <h1>CRM Workspace</h1>
            <p>Switch between contacts, leads, clients, and activities.</p>
          </div>
          <CRMViewTabs activeView={activeView} setActiveView={setActiveView} />
        </div>

        <section className="crm-card">
          <h3>{activeView.charAt(0).toUpperCase() + activeView.slice(1)}</h3>
          <p>
            This is the <strong>{activeView}</strong> view inside the CRM module. Choose another tab
            to switch the displayed content.
          </p>
        </section>

        <section className="crm-summary-grid">
          <div className="crm-summary-item">
            <h4>Contacts</h4>
            <strong>1,324</strong>
          </div>
          <div className="crm-summary-item">
            <h4>Leads</h4>
            <strong>428</strong>
          </div>
          <div className="crm-summary-item">
            <h4>Clients</h4>
            <strong>215</strong>
          </div>
          <div className="crm-summary-item">
            <h4>Activities</h4>
            <strong>79 today</strong>
          </div>
        </section>

        <section className="crm-card">
          <h3>{activeSection === 'crmOverview' ? 'CRM Overview' : activeSection === 'crmReports' ? 'CRM Reports' : 'CRM Goals'}</h3>
          <p>
            {activeSection === 'crmOverview'
              ? 'Summary and pipeline health are shown here.'
              : activeSection === 'crmReports'
              ? 'Reports will let you analyze pipeline and contact metrics.'
              : 'Goals help you track targets and team performance.'}
          </p>
        </section>
      </main>
    </div>
  )
}

export default CRMPage
