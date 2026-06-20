import React from 'react'
import { BarChart3, Users, Target, Briefcase, Activity } from 'lucide-react'

const VIEW_TABS = [
  { id: 'analytics', label: 'Analytics', icon: BarChart3 },
  { id: 'contacts', label: 'Contacts', icon: Users },
  { id: 'leads', label: 'Leads', icon: Target },
  { id: 'clients', label: 'Clients', icon: Briefcase },
  { id: 'activities', label: 'Activities', icon: Activity },
]

const CRMViewTabs = ({ activeView, setActiveView }) => {
  return (
    <div className="crm-tabs">
      {VIEW_TABS.map((tab) => {
        const Icon = tab.icon
        return (
          <button
            key={tab.id}
            type="button"
            className={`crm-tab ${activeView === tab.id ? 'active' : ''}`}
            onClick={() => setActiveView(tab.id)}
          >
            <Icon size={16} />
            <span>{tab.label}</span>
          </button>
        )
      })}
    </div>
  )
}

export default CRMViewTabs
