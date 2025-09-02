import '../shared/tailwind.css'
import { getCurrentUser } from '../shared/utils.js'

const state = {
  currentId: null,
  currentUlid: null,
  initialized: false,
  isLoadingComments: false
}

grist.ready({ requiredAccess: 'full' })

const ensureSetup = async () => {
  if (state.initialized) return
  state.initialized = true
  
  const [tableId, tables, docTableData] = await Promise.all([
    grist.getSelectedTableId(),
    grist.docApi.listTables(),
    grist.getSelectedTableId().then(grist.docApi.fetchTable)
  ])
  
  const actions = []
  
  // Add ulid column if missing
  if (!Object.keys(docTableData).includes('ulid')) {
    actions.push(
      ['AddHiddenColumn', tableId, 'temporary_trigger', { type: 'Int' }],
      ['AddHiddenColumn', tableId, 'ulid', {
        type: 'Text',
        formula: 'from ulid import ULID; value or IFERROR(str(ULID()))',
        recalcWhen: 2,
        untieColIdFromLabel: true,
        isFormula: false
      }],
      ['BulkUpdateRecord', tableId, docTableData.id, { 
        temporary_trigger: docTableData.id.map(() => 1) 
      }],
      ['RemoveColumn', tableId, 'temporary_trigger']
    )
  }
  
  // Add RowComments table if missing
  const needsRowCommentsTable = !tables.includes('RowComments')
  if (needsRowCommentsTable) {
    actions.push(['AddTable', 'RowComments', [
      { id: 'user', type: 'Text' },
      { id: 'timestamp', type: 'DateTime' },
      { id: 'row_ulid', type: 'Text' },
      { id: 'content', type: 'Text' }
    ]])
  }
  
  if (actions.length) await grist.docApi.applyUserActions(actions)
  
  // Remove auto-generated RowComments views
  if (needsRowCommentsTable) {
    const { id, name } = await grist.docApi.fetchTable('_grist_Views')
    const viewsToRemove = id.filter((_, i) => name[i] === 'RowComments')
    
    if (viewsToRemove.length) {
      await grist.docApi.applyUserActions(viewsToRemove.map(id => ['RemoveView', id]))
    }
  }
}

const loadComments = async () => {
  if (!state.currentUlid || state.isLoadingComments) {
    if (!state.currentUlid) await renderChatBubbles([])
    return
  }
  
  state.isLoadingComments = true
  
  try {
    const commentsData = await grist.docApi.fetchTable('RowComments')
    
    if (!commentsData?.id?.length) {
      await renderChatBubbles([])
      return
    }
    
    const comments = commentsData.id
      .map((commentId, i) => ({
        id: commentId,
        content: commentsData.content[i],
        user: commentsData.user[i],
        timestamp: commentsData.timestamp[i],
        row_ulid: commentsData.row_ulid[i]
      }))
      .filter(({ row_ulid }) => row_ulid === state.currentUlid)
      .sort((a, b) => a.timestamp - b.timestamp)
    
    await renderChatBubbles(comments)
  } catch (error) {
    console.error('Error loading comments:', error)
    await renderChatBubbles([])
  } finally {
    state.isLoadingComments = false
  }
}

const renderChatBubbles = async (comments) => {
  const chatContainer = document.getElementById('chatContainer')
  if (!chatContainer) return
  
  const { email } = await getCurrentUser()
  
  const createChatBubble = (comment) => {
    const isCurrentUser = comment.user === email
    const userName = comment.user.split('@')[0]
    const deleteButton = isCurrentUser 
      ? `<button class="absolute top-2 right-2 w-4 h-4 rounded-full bg-error/80 hover:bg-error text-white flex items-center justify-center text-xs leading-none opacity-0 hover:opacity-100 transition-opacity z-10" onclick="deleteComment(${comment.id})" title="Delete comment">×</button>`
      : ''
    
    return `
      <div class="chat ${isCurrentUser ? 'chat-end' : 'chat-start'} ${isCurrentUser ? 'relative group' : ''}" 
           ${isCurrentUser ? `onmouseenter="this.querySelector('button').style.opacity='1'" onmouseleave="this.querySelector('button').style.opacity='0'"` : ''}>
        <div class="chat-header">
          ${userName} <time class="text-xs opacity-50">${formatTimestamp(comment.timestamp)}</time>
        </div>
        <div class="chat-bubble">${comment.content}</div>
        ${deleteButton}
      </div>
    `
  }
  
  chatContainer.innerHTML = comments.map(createChatBubble).join('')
  chatContainer.scrollTop = chatContainer.scrollHeight
}

window.deleteComment = async (commentId) => {
  try {
    await grist.getTable('RowComments').destroy(commentId)
    await loadComments()
  } catch (error) {
    console.error('Error deleting comment:', error)
  }
}

const formatTimestamp = (timestamp) => {
  const diffSec = (Date.now() - timestamp * 1000) / 1000
  const diffMin = Math.floor(diffSec / 60)
  const diffHour = Math.floor(diffSec / 3600)
  const diffDay = Math.floor(diffSec / 86400)
  
  if (diffSec < 60) return 'just now'
  if (diffSec < 3600) return `${diffMin} min${diffMin !== 1 ? 's' : ''} ago`
  if (diffSec < 86400) return `${diffHour} hour${diffHour !== 1 ? 's' : ''} ago`
  if (diffSec < 604800) return `${diffDay} day${diffDay !== 1 ? 's' : ''} ago`
  return new Date(timestamp * 1000).toLocaleDateString()
}

const addComment = async (content) => {
  const { email } = await getCurrentUser()
  
  await grist.getTable('RowComments').create({
    fields: {
      user: email,
      timestamp: Date.now() / 1000,
      row_ulid: state.currentUlid,
      content
    }
  })
  
  await loadComments()
}

grist.onRecord(async (record) => {
  await ensureSetup()
  
  state.currentId = record.id
  
  if (state.currentId) {
    try {
      const tableId = await grist.getSelectedTableId()
      const { id, ulid } = await grist.docApi.fetchTable(tableId)
      const rowIndex = id.indexOf(state.currentId)
      state.currentUlid = rowIndex >= 0 && ulid ? ulid[rowIndex] : null
    } catch (error) {
      console.error('Error fetching ulid:', error)
      state.currentUlid = null
    }
  }
  
  // Update UI
  const submitButton = document.querySelector('button[type="submit"]')
  const contentInput = document.getElementById('contentInput')
  
  if (submitButton && contentInput) {
    submitButton.disabled = !state.currentId
    contentInput.placeholder = state.currentId ? 'Enter your comment here...' : 'Select a record to add comments...'
  }
  
  await loadComments()
})

document.addEventListener('DOMContentLoaded', () => {
  document.getElementById('contentForm')?.addEventListener('submit', async (e) => {
    e.preventDefault()
    
    const input = e.target.querySelector('#contentInput')
    const content = input.value.trim()
    
    if (!content || !state.currentId || !state.currentUlid) return
    
    input.value = ''
    try {
      await addComment(content)
    } catch (error) {
      console.error('Error adding comment:', error)
    }
  })
})
