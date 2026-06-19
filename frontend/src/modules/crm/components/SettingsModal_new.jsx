import React, { useState } from 'react'
import { X, Zap, Users, BarChart3, Bell, Lock, ChevronLeft } from 'lucide-react'
import PipelineSettings from './PipelineSettingsNew'
import '../styles/SettingsModal.css'

const SettingsModal = ({ onClose, onPipelineCreated }) => {
  const [activeTab, setActiveTab] = useState(null)

  const handlePipelineClick = () => {
    setActiveTab('pipeline')
  }

  const handleBackClick = () => {
    setActiveTab(null)
  }

  return (
    <div className="settings-modal-overlay">
      <div className="settings-modal">
        <div className="settings-modal-header">
          <h2>Settings</h2>
          <button className="close-btn" onClick={onClose} aria-label="Close">
            <X size={24} />
          </button>
        </div>

        {activeTab === null ? (
          <div className="settings-grid">
            <button className="settings-card" onClick={handlePipelineClick}>
              <Zap size={48} />
              <span>Manage Pipelines</span>
            </button>
            <button className="settings-card" disabled>
              <Users size={48} />
              <span>Team Members</span>
            </button>
            <button className="settings-card" disabled>
              <BarChart3 size={48} />
              <span>Analytics</span>
            </button>
            <button className="settings-card" disabled>
              <Bell size={48} />
              <span>Notifications</span>
            </button>
            <button className="settings-card" disabled>
              <Lock size={48} />
              <span>Privacy</span>
            </button>
          </div>
        ) : activeTab === 'pipeline' ? (
          <div className="settings-content">
            <button className="back-btn" onClick={handleBackClick}>
              <ChevronLeft size={16} /> Back
            </button>
            <PipelineSettings onPipelineCreated={onPipelineCreated} />
          </div>
        ) : null}
      </div>
    </div>
  )
}

export default SettingsModal
