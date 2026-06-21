import React, { useState, useRef, useEffect, useCallback } from 'react'
import { MessageCircle, X, Send, Sparkles, Minimize2, Maximize2, User } from 'lucide-react'
import '../styles/CRMChatBot.css'

const STORAGE_KEY = 'crm_chatbot_history'

const WELCOME_MESSAGE = {
  role: 'assistant',
  content: "Hi! I'm your CRM assistant. I can help you with contacts, leads, pipelines, clients, activities, and tags in your CRM. What would you like to know?",
}

function renderRichContent(text) {
  if (!text) return null

  // Split into paragraphs
  const paragraphs = text.split('\n\n').filter(Boolean)
  const elements = []

  paragraphs.forEach((para, pIdx) => {
    const lines = para.split('\n').filter(Boolean)

    // Check if this is a table-like structure (multiple lines with | separators)
    const tableLines = lines.filter((l) => l.includes('|') && !l.startsWith('Here') && !l.startsWith('Feel free'))
    if (tableLines.length >= 2) {
      // Render as a table
      const headers = tableLines[0].split('|').map((h) => h.trim()).filter(Boolean)
      const dataRows = tableLines.slice(1).map((row) =>
        row.split('|').map((c) => c.trim()).filter(Boolean)
      )

      if (headers.length > 0 && dataRows.length > 0) {
        elements.push(
          <div key={pIdx} className="chatbot-rich-table-wrapper">
            <table className="chatbot-rich-table">
              <thead>
                <tr>
                  {headers.map((h, i) => (
                    <th key={i}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {dataRows.map((row, ri) => (
                  <tr key={ri}>
                    {row.map((cell, ci) => (
                      <td key={ci}>{cell}</td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )
        return
      }
    }

    // Check if it's a bullet list
    const bulletItems = lines.filter((l) => l.match(/^[-•*]/))
    if (bulletItems.length >= 2 && bulletItems.length === lines.length) {
      elements.push(
        <div key={pIdx} className="chatbot-rich-list-wrapper">
          <ul className="chatbot-rich-list">
            {bulletItems.map((item, i) => {
              const text = item.replace(/^[-•*]\s*/, '')
              return (
                <li key={i} className="chatbot-rich-list-item">
                  {renderInlineContent(text)}
                </li>
              )
            })}
          </ul>
        </div>
      )
      return
    }

    // Regular paragraph with inline formatting
    elements.push(
      <p key={pIdx} className="chatbot-rich-paragraph">
        {renderInlineContent(lines.join(' '))}
      </p>
    )
  })

  return elements
}

function renderInlineContent(text) {
  if (!text) return text

  const parts = []
  let remaining = text
  let key = 0

  // Pattern: **bold text**
  const boldRegex = /\*\*(.*?)\*\*/g
  let lastIndex = 0
  let match

  while ((match = boldRegex.exec(remaining)) !== null) {
    // Text before bold
    if (match.index > lastIndex) {
      parts.push(renderValueHighlights(remaining.slice(lastIndex, match.index), key++))
    }
    parts.push(
      <strong key={key++}>{match[1]}</strong>
    )
    lastIndex = match.index + match[0].length
  }

  // Remaining text
  if (lastIndex < remaining.length) {
    parts.push(renderValueHighlights(remaining.slice(lastIndex), key++))
  }

  return parts.length > 0 ? parts : renderValueHighlights(text, 0)
}

function renderValueHighlights(text, key) {
  if (!text) return text

  // Highlight dollar amounts
  const dollarRegex = /\$[\d,]+(?:\.\d{2})?/g
  // Highlight percentages
  const percentRegex = /\d+%/g
  // Highlight numbers
  const numberRegex = /\b(\d+)\b/g

  const parts = []
  let remaining = text
  let lastIndex = 0

  // Combine all highlight patterns
  const combinedRegex = /(\$[\d,]+(?:\.\d{2})?|\d+%|(\d+)(?=\s*(?:lead|contact|client|pipeline|activity|tag|phase)s?\b))/gi
  let match

  while ((match = combinedRegex.exec(remaining)) !== null) {
    if (match.index > lastIndex) {
      parts.push(remaining.slice(lastIndex, match.index))
    }
    const value = match[0]
    if (value.startsWith('$')) {
      parts.push(
        <span key={`${key}-${match.index}`} className="chatbot-highlight-value">💵 {value}</span>
      )
    } else if (value.endsWith('%')) {
      parts.push(
        <span key={`${key}-${match.index}`} className="chatbot-highlight-value">📈 {value}</span>
      )
    } else if (/\d+/.test(value)) {
      parts.push(
        <span key={`${key}-${match.index}`} className="chatbot-highlight-num">{value}</span>
      )
    } else {
      parts.push(value)
    }
    lastIndex = match.index + match[0].length
  }

  if (lastIndex < remaining.length) {
    parts.push(remaining.slice(lastIndex))
  }

  return parts.length > 0 ? parts : text
}

function loadChatHistory() {
  try {
    const saved = localStorage.getItem(STORAGE_KEY)
    if (saved) {
      const parsed = JSON.parse(saved)
      if (Array.isArray(parsed) && parsed.length > 0) {
        return parsed
      }
    }
  } catch {
    // Ignore parse errors
  }
  return [WELCOME_MESSAGE]
}

function saveChatHistory(messages) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(messages.slice(-50)))
  } catch {
    // Ignore storage errors
  }
}

const CRMChatBot = () => {
  const [isOpen, setIsOpen] = useState(false)
  const [isMinimized, setIsMinimized] = useState(false)
  const [messages, setMessages] = useState(loadChatHistory)
  const [inputValue, setInputValue] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [position, setPosition] = useState({ x: window.innerWidth - 400, y: window.innerHeight - 600 })
  const [isDragging, setIsDragging] = useState(false)
  const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 })

  const chatRef = useRef(null)
  const messagesEndRef = useRef(null)
  const inputRef = useRef(null)

  // Save to localStorage whenever messages change
  useEffect(() => {
    saveChatHistory(messages)
  }, [messages])

  // Auto-scroll to bottom
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages, isLoading])

  // Focus input when opened
  useEffect(() => {
    if (isOpen && !isMinimized) {
      setTimeout(() => inputRef.current?.focus(), 300)
    }
  }, [isOpen, isMinimized])

  // Ensure chat stays within viewport on resize
  useEffect(() => {
    const handleResize = () => {
      setPosition((prev) => ({
        x: Math.min(prev.x, window.innerWidth - 380),
        y: Math.min(prev.y, window.innerHeight - 100),
      }))
    }
    window.addEventListener('resize', handleResize)
    return () => window.removeEventListener('resize', handleResize)
  }, [])

  // Dragging handlers
  const handleMouseDown = useCallback((e) => {
    if (e.target.closest('.crm-chatbot-header-actions')) return
    setIsDragging(true)
    const rect = chatRef.current?.getBoundingClientRect()
    if (rect) {
      setDragOffset({
        x: e.clientX - rect.left,
        y: e.clientY - rect.top,
      })
    }
  }, [])

  useEffect(() => {
    if (!isDragging) return

    const handleMouseMove = (e) => {
      setPosition({
        x: Math.max(0, Math.min(e.clientX - dragOffset.x, window.innerWidth - 380)),
        y: Math.max(0, Math.min(e.clientY - dragOffset.y, window.innerHeight - 100)),
      })
    }

    const handleMouseUp = () => {
      setIsDragging(false)
    }

    document.addEventListener('mousemove', handleMouseMove)
    document.addEventListener('mouseup', handleMouseUp)
    return () => {
      document.removeEventListener('mousemove', handleMouseMove)
      document.removeEventListener('mouseup', handleMouseUp)
    }
  }, [isDragging, dragOffset])

  const sendMessage = useCallback(async () => {
    const message = inputValue.trim()
    if (!message || isLoading) return

    setInputValue('')
    setMessages((prev) => [...prev, { role: 'user', content: message }])
    setIsLoading(true)

    try {
      const res = await fetch('/api/crm/ai/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message,
          history: messages.slice(-20).map((m) => ({ role: m.role, content: m.content })),
        }),
      })

      if (res.ok) {
        const data = await res.json()
        setMessages((prev) => [...prev, { role: 'assistant', content: data.reply }])
      } else {
        setMessages((prev) => [
          ...prev,
          { role: 'assistant', content: "I'm sorry, I couldn't process your request. Please try again." },
        ])
      }
    } catch {
      setMessages((prev) => [
        ...prev,
        { role: 'assistant', content: 'Network error. Please check your connection and try again.' },
      ])
    } finally {
      setIsLoading(false)
    }
  }, [inputValue, isLoading, messages])

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      sendMessage()
    }
  }

  const toggleOpen = () => {
    setIsOpen((prev) => !prev)
    setIsMinimized(false)
  }

  const toggleMinimize = () => {
    setIsMinimized((prev) => !prev)
  }

  const handleClose = () => {
    setIsOpen(false)
    setIsMinimized(false)
  }

  const handleClearHistory = () => {
    setMessages([WELCOME_MESSAGE])
    saveChatHistory([WELCOME_MESSAGE])
  }

  return (
    <>
      {/* Floating Chat Button */}
      <button
        className={`crm-chatbot-toggle ${isOpen ? 'open' : ''}`}
        onClick={toggleOpen}
        aria-label="Toggle CRM Chat"
        title="CRM Assistant"
      >
        {isOpen ? <X size={22} /> : <MessageCircle size={22} />}
      </button>

      {/* Chat Window */}
      {isOpen && (
        <div
          ref={chatRef}
          className={`crm-chatbot-window ${isMinimized ? 'minimized' : ''} ${isDragging ? 'dragging' : ''}`}
          style={{
            right: Math.max(20, window.innerWidth - position.x - 380),
            bottom: Math.max(20, window.innerHeight - position.y - 500),
            transform: 'none',
            left: 'auto',
            top: 'auto',
          }}
        >
          {/* Header (drag handle) */}
          <div
            className="crm-chatbot-header"
            onMouseDown={handleMouseDown}
          >
            <div className="crm-chatbot-header-left">
              <Sparkles size={16} />
              <span>CRM Assistant</span>
            </div>
            <div className="crm-chatbot-header-actions">
              <button
                className="crm-chatbot-header-btn"
                onClick={handleClearHistory}
                title="Clear chat"
                aria-label="Clear chat history"
              >
                <MessageCircle size={13} />
              </button>
              <button
                className="crm-chatbot-header-btn"
                onClick={toggleMinimize}
                title={isMinimized ? 'Expand' : 'Minimize'}
                aria-label={isMinimized ? 'Expand chat' : 'Minimize chat'}
              >
                {isMinimized ? <Maximize2 size={14} /> : <Minimize2 size={14} />}
              </button>
              <button
                className="crm-chatbot-header-btn"
                onClick={handleClose}
                title="Close"
                aria-label="Close chat"
              >
                <X size={14} />
              </button>
            </div>
          </div>

          {/* Messages */}
          {!isMinimized && (
            <>
              <div className="crm-chatbot-messages">
                {messages.map((msg, idx) => (
                  <div key={idx} className={`crm-chatbot-message ${msg.role}`}>
                    {msg.role === 'assistant' && (
                      <div className="crm-chatbot-avatar">
                        <Sparkles size={12} />
                      </div>
                    )}
                    {msg.role === 'user' && (
                      <div className="crm-chatbot-avatar">
                        <User size={12} />
                      </div>
                    )}
                    <div className="crm-chatbot-bubble">
                      {msg.role === 'assistant' ? (
                        renderRichContent(msg.content)
                      ) : (
                        <p>{msg.content}</p>
                      )}
                    </div>
                  </div>
                ))}

                {/* Animated AI Thinking Loader */}
                {isLoading && (
                  <div className="crm-chatbot-message assistant">
                    <div className="crm-chatbot-avatar">
                      <Sparkles size={12} />
                    </div>
                    <div className="crm-chatbot-bubble">
                      <div className="chatbot-thinking-loader">
                        <div className="chatbot-thinking-matrix" aria-hidden="true" />
                        <span className="chatbot-thinking-text">AI is analyzing your CRM data...</span>
                      </div>
                    </div>

                  </div>
                )}
                <div ref={messagesEndRef} />
              </div>

              {/* Input */}
              <div className="crm-chatbot-input-area">
                <textarea
                  ref={inputRef}
                  className="crm-chatbot-input"
                  placeholder="Ask about your CRM data..."
                  value={inputValue}
                  onChange={(e) => setInputValue(e.target.value)}
                  onKeyDown={handleKeyDown}
                  rows={1}
                  disabled={isLoading}
                />
                <button
                  className={`crm-chatbot-send-btn ${isLoading ? 'loading' : ''}`}
                  onClick={sendMessage}
                  disabled={!inputValue.trim() || isLoading}
                  aria-label="Send message"
                >
                  {isLoading ? (
                    <div className="chatbot-send-spinner" />
                  ) : (
                    <Send size={16} />
                  )}
                </button>
              </div>
            </>
          )}
        </div>
      )}
    </>
  )
}

export default CRMChatBot
