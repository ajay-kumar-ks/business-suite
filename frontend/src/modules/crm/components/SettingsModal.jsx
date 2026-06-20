import React, { useState } from 'react'
import { X, Zap, Shuffle, Users, ChevronLeft } from 'lucide-react'
import PipelineSettings from './PipelineSettings'
import CreatePipelinePanel from './CreatePipelinePanel'
import AssignMemberPanel from './AssignMemberPanel'
import '../styles/SettingsModal.css'

const SettingsModal = ({ onClose, onPipelineCreated }) => {
  const [activeTab, setActiveTab] = useState(null)

  const handleManagePipelineClick = () => setActiveTab('manage')
  const handleCreatePipelineClick = () => setActiveTab('create')
  const handleAssignMemberClick = () => setActiveTab('assign')
  const handleBackClick = () => setActiveTab(null)

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
            <button className="settings-card" onClick={handleManagePipelineClick}>
              <Zap size={48} />
              <span>Manage Pipeline</span>
            </button>
            <button className="settings-card" onClick={handleCreatePipelineClick}>
              <Shuffle size={48} />
              <span>Create Pipeline</span>
            </button>
            <button className="settings-card" onClick={handleAssignMemberClick}>
              <Users size={48} />
              <span>Assign Member</span>
            </button>
          </div>
        ) : (
          <div className="settings-content">
            <button className="back-btn" onClick={handleBackClick}>
              ← Back
            </button>
            {activeTab === 'create' ? (
              <CreatePipelinePanel onClose={() => setActiveTab(null)} onPipelineCreated={onPipelineCreated} />
            ) : activeTab === 'assign' ? (
              <AssignMemberPanel onPipelineCreated={onPipelineCreated} />
            ) : (
              <PipelineSettings onPipelineCreated={onPipelineCreated} />
            )}
          </div>
        )}
      </div>
    </div>
  )
}

export default SettingsModal
