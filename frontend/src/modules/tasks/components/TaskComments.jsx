import React, { useState, useEffect, useCallback, useRef } from 'react'
import { Send, Trash2, MessageSquare, User as UserIcon, Clock, AtSign } from 'lucide-react'
import Avatar from '../../../components/ui/Avatar'
import { taskApi } from '../services/taskApi'
import { useAuth } from '../../../context/AuthContext'
import '../styles/TaskComments.css'

const TaskComments = ({ taskId }) => {
  const { user } = useAuth()
  const [comments, setComments] = useState([])
  const [newComment, setNewComment] = useState('')
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState(null)

  // @mention state
  const [mentionSearch, setMentionSearch] = useState('')
  const [mentionResults, setMentionResults] = useState([])
  const [mentionIndex, setMentionIndex] = useState(-1)
  const [showMentions, setShowMentions] = useState(false)
  const [mentionedUsers, setMentionedUsers] = useState([]) // { id, name }
  const mentionDropdownRef = useRef(null)
  const textareaRef = useRef(null)
  const listEndRef = useRef(null)

  const fetchComments = useCallback(async () => {
    try {
      setLoading(true)
      setError(null)
      const res = await taskApi.getComments(taskId)
      setComments(res.data || [])
    } catch (err) {
      console.error('Failed to fetch comments:', err)
      setError('Failed to load comments')
    } finally {
      setLoading(false)
    }
  }, [taskId])

  useEffect(() => {
    if (taskId) fetchComments()
  }, [taskId, fetchComments])

  // Scroll to bottom when new comments arrive
  useEffect(() => {
    if (listEndRef.current) {
      listEndRef.current.scrollIntoView({ behavior: 'smooth' })
    }
  }, [comments])

  // Close mention dropdown on outside click
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (mentionDropdownRef.current && !mentionDropdownRef.current.contains(e.target)) {
        setShowMentions(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  // Debounced mention search
  useEffect(() => {
    if (!mentionSearch.trim()) {
      setMentionResults([])
      return
    }
    const timer = setTimeout(async () => {
      try {
        const res = await taskApi.searchUsers(mentionSearch.trim())
        const results = (res.data || []).filter(
          (u) => !mentionedUsers.some((mu) => mu.id === u.id) && u.id !== user?.id
        )
        setMentionResults(results)
        setMentionIndex(-1)
        setShowMentions(results.length > 0)
      } catch {
        setMentionResults([])
      }
    }, 200)
    return () => clearTimeout(timer)
  }, [mentionSearch, mentionedUsers, user?.id])

  const handleTextChange = (e) => {
    const value = e.target.value
    setNewComment(value)

    // Detect if we're typing a mention
    const cursorPos = e.target.selectionStart
    const textBefore = value.slice(0, cursorPos)
    const atMatch = textBefore.match(/@(\w*)$/)

    if (atMatch) {
      setMentionSearch(atMatch[1])
    } else {
      setMentionSearch('')
      setShowMentions(false)
    }
  }

  const handleKeyDown = (e) => {
    // Ctrl+Enter or Cmd+Enter to submit
    if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') {
      e.preventDefault()
      handleSubmit(e)
      return
    }

    // Navigate mention dropdown
    if (showMentions && mentionResults.length > 0) {
      if (e.key === 'ArrowDown') {
        e.preventDefault()
        setMentionIndex((prev) => (prev < mentionResults.length - 1 ? prev + 1 : 0))
      } else if (e.key === 'ArrowUp') {
        e.preventDefault()
        setMentionIndex((prev) => (prev > 0 ? prev - 1 : mentionResults.length - 1))
      } else if (e.key === 'Enter' || e.key === 'Tab') {
        if (mentionIndex >= 0 && mentionIndex < mentionResults.length) {
          e.preventDefault()
          insertMention(mentionResults[mentionIndex])
        }
      } else if (e.key === 'Escape') {
        setShowMentions(false)
      }
    }
  }

  const insertMention = (mentionedUser) => {
    const cursorPos = textareaRef.current?.selectionStart || newComment.length
    const textBefore = newComment.slice(0, cursorPos)
    const textAfter = newComment.slice(cursorPos)
    const atMatch = textBefore.match(/@(\w*)$/)

    if (atMatch) {
      const prefix = textBefore.slice(0, atMatch.index)
      const mentionTag = `@${mentionedUser.name} `
      const newValue = prefix + mentionTag + textAfter

      setNewComment(newValue)
      setMentionedUsers((prev) => {
        // Replace if same user ID exists, otherwise append
        const filtered = prev.filter((mu) => mu.id !== mentionedUser.id)
        return [...filtered, { id: mentionedUser.id, name: mentionedUser.name }]
      })
      setShowMentions(false)
      setMentionSearch('')

      // Focus back to textarea and position cursor after the inserted mention
      setTimeout(() => {
        if (textareaRef.current) {
          const newPos = prefix.length + mentionTag.length
          textareaRef.current.focus()
          textareaRef.current.setSelectionRange(newPos, newPos)
        }
      }, 0)
    }
  }

  // ── Render comment content with highlighted @mentions ──
  const renderContent = (content) => {
    if (!content) return null

    // Split by @mention patterns — match @ followed by word chars (no spaces, dots, or special chars)
    const parts = content.split(/(@\w+)/g)
    return parts.map((part, i) => {
      if (part.startsWith('@') && part.length > 1) {
        const name = part.slice(1).trim()
        if (name) {
          return (
            <span key={i} className="mention-highlight">
              <AtSign size={11} />
              {name}
            </span>
          )
        }
      }
      return <span key={i}>{part}</span>
    })
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    const content = newComment.trim()
    if (!content) return

    setSubmitting(true)
    try {
      const payload = {
        content,
        mentioned_user_ids: mentionedUsers.length > 0
          ? mentionedUsers.map((mu) => mu.id)
          : null,
      }
      const res = await taskApi.createComment(taskId, payload)
      setComments((prev) => [...prev, res.data])
      setNewComment('')
      setMentionedUsers([])
      setShowMentions(false)
      textareaRef.current?.focus()
    } catch (err) {
      console.error('Failed to create comment:', err)
    } finally {
      setSubmitting(false)
    }
  }

  const handleDelete = async (commentId) => {
    try {
      await taskApi.deleteComment(taskId, commentId)
      setComments((prev) => prev.filter((c) => c.id !== commentId))
    } catch (err) {
      console.error('Failed to delete comment:', err)
    }
  }

  const formatDate = (dateStr) => {
    const d = new Date(dateStr)
    const now = new Date()
    const diffMs = now - d
    const diffMins = Math.floor(diffMs / 60000)
    const diffHours = Math.floor(diffMs / 3600000)
    const diffDays = Math.floor(diffMs / 86400000)

    if (diffMins < 1) return 'Just now'
    if (diffMins < 60) return `${diffMins}m ago`
    if (diffHours < 24) return `${diffHours}h ago`
    if (diffDays < 7) return `${diffDays}d ago`
    return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
  }

  return (
    <div className="task-comments-section">
      <div className="task-comments-header">
        <MessageSquare size={16} />
        <span>Comments</span>
        {!loading && <span className="task-comments-count">{comments.length}</span>}
      </div>

      {/* Comments List */}
      <div className="task-comments-list">
        {loading ? (
          <div className="task-comments-loading">
            <div className="comment-skeleton" />
            <div className="comment-skeleton" />
          </div>
        ) : error ? (
          <div className="task-comments-error">{error}</div>
        ) : comments.length === 0 ? (
          <div className="task-comments-empty">
            <MessageSquare size={24} />
            <span>No comments yet. Start the discussion!</span>
          </div>
        ) : (
          comments.map((comment) => (
            <div className="task-comment-item" key={comment.id}>
              <div className="comment-avatar">
                <Avatar name={comment.user_name || comment.user_email} size={32} />
              </div>
              <div className="comment-body">
                <div className="comment-meta">
                  <span className="comment-author">
                    <UserIcon size={12} />
                    {comment.user_name || comment.user_email || `User #${comment.user_id}`}
                  </span>
                  <span className="comment-time">
                    <Clock size={11} />
                    {formatDate(comment.created_at)}
                  </span>
                </div>
                <div className="comment-content">{renderContent(comment.content)}</div>
                {comment.user_id === user?.id && (
                  <button
                    className="comment-delete-btn"
                    onClick={() => handleDelete(comment.id)}
                    title="Delete comment"
                    type="button"
                  >
                    <Trash2 size={12} />
                  </button>
                )}
              </div>
            </div>
          ))
        )}
        <div ref={listEndRef} />
      </div>

      {/* Comment Input with @mention */}
      <div className="task-comments-input">
        <div className="comment-input-wrapper mention-input-wrapper">
          <textarea
            ref={textareaRef}
            value={newComment}
            onChange={handleTextChange}
            onKeyDown={handleKeyDown}
            placeholder="Write a comment... Use @ to mention someone"
            rows={2}
            disabled={submitting}
            maxLength={2000}
          />
          <button
            type="button"
            className="comment-send-btn"
            disabled={submitting || !newComment.trim()}
            title="Send comment (Ctrl+Enter)"
            onClick={handleSubmit}
          >
            <Send size={16} />
          </button>

          {/* @mention dropdown */}
          {showMentions && mentionResults.length > 0 && (
            <div className="mention-dropdown" ref={mentionDropdownRef}>
              {mentionResults.map((mu, i) => (
                <div
                  key={mu.id}
                  className={`mention-option ${i === mentionIndex ? 'mention-option-active' : ''}`}
                  onMouseDown={(e) => {
                    e.preventDefault()
                    insertMention(mu)
                  }}
                >
                  <Avatar name={mu.name} size={22} />
                  <div className="mention-option-info">
                    <span className="mention-option-name">{mu.name}</span>
                    <span className="mention-option-email">{mu.email}</span>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Mentioned users indicator */}
          {mentionedUsers.length > 0 && !showMentions && (
            <div className="mentioned-badge-wrapper">
              <AtSign size={12} />
              <span>{mentionedUsers.length}</span>
            </div>
          )}
        </div>
        <div className="comment-input-footer">
          <div className="comment-input-footer-left">
            <span className="comment-mention-hint">
              <AtSign size={10} /> Type @ to mention someone
            </span>
          </div>
          <div className="comment-input-footer-right">
            <span className="comment-char-count">{newComment.length}/2000</span>
            <span className="comment-shortcut-hint">Ctrl+Enter to send</span>
          </div>
        </div>
      </div>
    </div>
  )
}

export default TaskComments
