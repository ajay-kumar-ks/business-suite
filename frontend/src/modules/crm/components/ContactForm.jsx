import React, { useState, useEffect } from 'react'
import { X, Plus, Trash2 } from 'lucide-react'
import Button from '../../../components/ui/Button'
import Input from '../../../components/ui/Input'
import '../styles/ContactForm.css'

const ContactForm = ({ contact = null, onSave, onCancel }) => {
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    phone: '',
    custom_fields: [],
  })

  const [errors, setErrors] = useState({})
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    if (contact) {
      setFormData({
        name: contact.name,
        email: contact.email || '',
        phone: contact.phone || '',
        custom_fields: contact.custom_fields || [],
      })
    }
  }, [contact])

  const handleInputChange = (e) => {
    const { name, value } = e.target
    setFormData(prev => ({
      ...prev,
      [name]: value
    }))
    // Clear error for this field
    if (errors[name]) {
      setErrors(prev => ({ ...prev, [name]: '' }))
    }
  }

  const handleCustomFieldChange = (index, field, value) => {
    const newFields = [...formData.custom_fields]
    newFields[index] = { ...newFields[index], [field]: value }
    setFormData(prev => ({
      ...prev,
      custom_fields: newFields
    }))
  }

  const addCustomField = () => {
    setFormData(prev => ({
      ...prev,
      custom_fields: [...prev.custom_fields, { label: '', value: '' }]
    }))
  }

  const removeCustomField = (index) => {
    setFormData(prev => ({
      ...prev,
      custom_fields: prev.custom_fields.filter((_, i) => i !== index)
    }))
  }

  const validateForm = () => {
    const newErrors = {}

    if (!formData.name.trim()) {
      newErrors.name = 'Name is required'
    }

    if (!formData.email && !formData.phone) {
      newErrors.contact = 'Either email or phone is required'
    }

    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  const handleSubmit = async (e) => {
    e.preventDefault()

    if (!validateForm()) return

    setLoading(true)
    try {
      const url = contact ? `/api/crm/contacts/${contact.id}` : '/api/crm/contacts/'
      const method = contact ? 'PUT' : 'POST'

      const response = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...formData,
          custom_fields: formData.custom_fields,
        })
      })

      if (!response.ok) throw new Error('Failed to save contact')

      const savedContact = await response.json()
      onSave(savedContact)
    } catch (error) {
      console.error('Failed to save contact:', error)
      setErrors({ submit: 'Failed to save contact. Please try again.' })
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="contact-form-container">
      <div className="contact-form-header">
        <h2>{contact ? 'Edit Contact' : 'New Contact'}</h2>
        <button className="close-btn" onClick={onCancel}>
          <X size={20} />
        </button>
      </div>

      <form onSubmit={handleSubmit} className="contact-form">
        {/* Basic Fields */}
        <div className="form-section">
          <h3>Contact Information</h3>
          
          <div className="form-row">
            <Input
              label="Name *"
              name="name"
              value={formData.name}
              onChange={handleInputChange}
              error={errors.name}
              required
            />
          </div>

          {errors.contact && <div className="form-error">{errors.contact}</div>}

          <div className="form-row two-col">
            <Input
              label="Email"
              name="email"
              type="email"
              value={formData.email}
              onChange={handleInputChange}
            />
            <Input
              label="Phone"
              name="phone"
              value={formData.phone}
              onChange={handleInputChange}
            />
          </div>
        </div>

        {/* Custom Fields */}
        <div className="form-section">
          <div className="section-header">
            <h3>Custom Fields</h3>
            <Button
              type="button"
              onClick={addCustomField}
              className="btn-icon add-field-btn"
              data-tooltip="Add Field"
              aria-label="Add Field"
            >
              <Plus size={16} />
            </Button>
          </div>

          <div className="custom-fields">
            {formData.custom_fields.map((field, index) => (
              <div key={index} className="custom-field-row">
                <Input
                  placeholder="Field Label"
                  value={field.label}
                  onChange={(e) => handleCustomFieldChange(index, 'label', e.target.value)}
                />
                <Input
                  placeholder="Field Value"
                  value={field.value}
                  onChange={(e) => handleCustomFieldChange(index, 'value', e.target.value)}
                />
                <button
                  type="button"
                  className="remove-btn"
                  onClick={() => removeCustomField(index)}
                >
                  <Trash2 size={16} />
                </button>
              </div>
            ))}
          </div>
        </div>

        {/* Form Actions */}
        <div className="form-actions">
          <Button type="button" className="btn-secondary" onClick={onCancel}>
            Cancel
          </Button>
          <Button type="submit" className="btn-primary" disabled={loading}>
            {loading ? 'Saving...' : 'Save Contact'}
          </Button>
        </div>
      </form>
    </div>
  )
}

export default ContactForm
