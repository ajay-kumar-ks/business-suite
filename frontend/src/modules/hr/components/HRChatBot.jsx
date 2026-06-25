import React, { useState, useRef, useEffect, useCallback } from 'react'
import { MessageCircle, X, Send, Sparkles, Minimize2, Maximize2, User } from 'lucide-react'
import api from '../../../services/api'
import '../styles/HRChatBot.css'

const STORAGE_KEY = 'hr_chatbot_history'

const WELCOME_MESSAGE = {
  role: 'assistant',
  content: "Hi! I'm your HR assistant. I can help you with employees, departments, attendance, leaves, recruitment, and user management. What would you like to know?",
}

function renderRichContent(text) {
  if (!text) return null

  const paragraphs = text.split('\n\n').filter(Boolean)
  const elements = []

  paragraphs.forEach((para, pIdx) => {
    const lines = para.split('\n').filter(Boolean)

    // Check if this is a table-like structure (multiple lines with | separators)
    const tableLines = lines.filter((l) => l.includes('|') && !l.startsWith('Here') && !l.startsWith('Feel free'))
    if (tableLines.length >= 2) {
      const headers = tableLines[0].split('|').map((h) => h.trim()).filter(Boolean)
      const dataRows = tableLines.slice(1).map((row) =>
        row.split('|').map((c) => c.trim()).filter(Boolean)
      )
      if (headers.length > 0 && dataRows.length > 0) {
        elements.push(
          <div key={pIdx} className="hr-chatbot-rich-table-wrapper">
            <table className="hr-chatbot-rich-table">
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
        <div key={pIdx} className="hr-chatbot-rich-list-wrapper">
          <ul className="hr-chatbot-rich-list">
            {bulletItems.map((item, i) => {
              const text = item.replace(/^[-•*]\s*/, '')
              return (
                <li key={i} className="hr-chatbot-rich-list-item">
                  {renderInlineContent(text)}
                </li>
              )
            })}
          </ul>
        </div>
      )
      return
    }

    elements.push(
      <p key={pIdx} className="hr-chatbot-rich-paragraph">
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

  const boldRegex = /\*\*(.*?)\*\*/g
  let lastIndex = 0
  let match

  while ((match = boldRegex.exec(remaining)) !== null) {
    if (match.index > lastIndex) {
      parts.push(renderValueHighlights(remaining.slice(lastIndex, match.index), key++))
    }
    parts.push(<strong key={key++}>{match[1]}</strong>)
    lastIndex = match.index + match[0].length
  }

  if (lastIndex < remaining.length) {
    parts.push(renderValueHighlights(remaining.slice(lastIndex), key++))
  }

  return parts.length > 0 ? parts : renderValueHighlights(text, 0)
}

function renderValueHighlights(text, key) {
  if (!text) return text

  const parts = []
  let remaining = text
  let lastIndex = 0

  const combinedRegex = /(\$[\d,]+(?:\.\d{2})?|\d+%|(\d+)(?=\s*(?:employee|candidate|leave|department|user|attendance|record|admin)s?\b))/gi
  let match

  while ((match = combinedRegex.exec(remaining)) !== null) {
    if (match.index > lastIndex) {
      parts.push(remaining.slice(lastIndex, match.index))
    }
    const value = match[0]
    if (value.startsWith('$')) {
      parts.push(<span key={`${key}-${match.index}`} className="hr-chatbot-highlight-value">💵 {value}</span>)
    } else if (value.endsWith('%')) {
      parts.push(<span key={`${key}-${match.index}`} className="hr-chatbot-highlight-value">📈 {value}</span>)
    } else if (/\d+/.test(value)) {
      parts.push(<span key={`${key}-${match.index}`} className="hr-chatbot-highlight-num">{value}</span>)
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

const HRChatBot = () => {
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
    if (e.target.closest('.hr-chatbot-header-actions')) return
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
      const res = await api.post('/hr/ai/chat', {
        message,
        history: messages.slice(-20).map((m) => ({ role: m.role, content: m.content })),
      })

      setMessages((prev) => [...prev, { role: 'assistant', content: res.data.reply }])
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
        className={`hr-chatbot-toggle ${isOpen ? 'open' : ''}`}
        onClick={toggleOpen}
        aria-label="Toggle HR Chat"
        title="HR Assistant"
      >
        {isOpen ? <X size={22} /> : <MessageCircle size={22} />}
      </button>

      {/* Chat Window */}
      {isOpen && (
        <div
          ref={chatRef}
          className={`hr-chatbot-window ${isMinimized ? 'minimized' : ''} ${isDragging ? 'dragging' : ''}`}
          style={{
            right: Math.max(20, window.innerWidth - position.x - 380),
            bottom: Math.max(20, window.innerHeight - position.y - 500),
            transform: 'none',
            left: 'auto',
            top: 'auto',
          }}
        >
          {/* Header (drag handle) */}
          <div className="hr-chatbot-header" onMouseDown={handleMouseDown}>
            <div className="hr-chatbot-header-left">
              <Sparkles size={16} />
              <span>HR Assistant</span>
            </div>
            <div className="hr-chatbot-header-actions">
              <button
                className="hr-chatbot-header-btn"
                onClick={handleClearHistory}
                title="Clear chat"
                aria-label="Clear chat history"
              >
                <MessageCircle size={13} />
              </button>
              <button
                className="hr-chatbot-header-btn"
                onClick={toggleMinimize}
                title={isMinimized ? 'Expand' : 'Minimize'}
                aria-label={isMinimized ? 'Expand chat' : 'Minimize chat'}
              >
                {isMinimized ? <Maximize2 size={14} /> : <Minimize2 size={14} />}
              </button>
              <button
                className="hr-chatbot-header-btn"
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
              <div className="hr-chatbot-messages">
                {messages.map((msg, idx) => (
                  <div key={idx} className={`hr-chatbot-message ${msg.role}`}>
                    {msg.role === 'assistant' && (
                      <div className="hr-chatbot-avatar">
                        <Sparkles size={12} />
                      </div>
                    )}
                    {msg.role === 'user' && (
                      <div className="hr-chatbot-avatar">
                        <User size={12} />
                      </div>
                    )}
                    <div className="hr-chatbot-bubble">
                      {msg.role === 'assistant' ? (
                        renderRichContent(msg.content)
                      ) : (
                        <p>{msg.content}</p>
                      )}
                    </div>
                  </div>
                ))}

                {isLoading && (
                  <div className="hr-chatbot-message assistant">
                    <div className="hr-chatbot-avatar">
                      <Sparkles size={12} />
                    </div>
                    <div className="hr-chatbot-bubble hr-chatbot-thinking-bubble">
                      <div className="hr-chatbot-thinking-loader" aria-label="Thinking" />
                    </div>
                  </div>
                )}
                <div ref={messagesEndRef} />
              </div>

              {/* Input */}
              <div className="hr-chatbot-input-area">
                <textarea
                  ref={inputRef}
                  className="hr-chatbot-input"
                  placeholder="Ask about your HR data..."
                  value={inputValue}
                  onChange={(e) => setInputValue(e.target.value)}
                  onKeyDown={handleKeyDown}
                  rows={1}
                  disabled={isLoading}
                />
                <button
                  className="hr-chatbot-send-btn"
                  onClick={sendMessage}
                  disabled={!inputValue.trim() || isLoading}
                  aria-label="Send message"
                >
                  <Send size={16} />
                </button>
              </div>
            </>
          )}
        </div>
      )}
    </>
  )
}

export default HRChatBot
