import '../../shared/tailwind.css'

const state = {
  currentId: null,
  currentUlid: null,
  initialized: false,
  isLoadingComments: false,
  previousId: null
}

console.log('Calling grist.ready...')
grist.ready({
  requiredAccess: 'full',
  allowSelectBy: true
})
console.log('grist.ready called, now registering onRecord handler...')

grist.onRecord(async (record, mappings) => {
  console.log('onRecord called with record:', record, 'mappings:', mappings)
  await ensureSetup()

  // Handle null/undefined record (no selection)
  const newId = record?.id || null

  // Log when selection changes
  if (state.previousId !== newId) {
    console.log('🔄 RECORD SELECTION CHANGED:', {
      from: state.previousId,
      to: newId,
      hasRecord: !!record
    })
    state.previousId = newId
  }

  state.currentId = newId
  state.currentUlid = null
  console.log('Set currentId to:', state.currentId, 'record:', record)

  if (state.currentId) {
    try {
      const tableId = await grist.getSelectedTableId()
      const { id, ulid } = await grist.docApi.fetchTable(tableId)
      const rowIndex = id.indexOf(state.currentId)
      state.currentUlid = rowIndex >= 0 && ulid ? ulid[rowIndex] : null
      console.log('Set currentUlid to:', state.currentUlid)
    } catch (error) {
      console.error('Error fetching ulid:', error)
      state.currentUlid = null
    }
  } else {
    console.log('No records selected, clearing state')
  }

  // Update UI
  const submitButton = document.querySelector('button[type="submit"]')
  const contentInput = document.getElementById('contentInput')

  const hasValidRecord = !!(state.currentId && state.currentUlid)
  console.log(
    'Submit button:',
    submitButton,
    'disabled:',
    !hasValidRecord,
    'currentId:',
    state.currentId,
    'currentUlid:',
    state.currentUlid
  )

  if (submitButton && contentInput) {
    submitButton.disabled = !hasValidRecord
    contentInput.placeholder = hasValidRecord
      ? 'Enter your comment here...'
      : 'Select a record to add comments...'
  }

  await loadComments()
})

grist.onNewRecord(() => {
  state.currentId = null
  state.currentUlid = null
  renderChatBubbles([])
  
  const submitButton = document.querySelector('button[type="submit"]')
  const contentInput = document.getElementById('contentInput')
  
  if (submitButton && contentInput) {
    submitButton.disabled = true
    contentInput.placeholder = 'Select a record to add comments...'
  }
})

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
      [
        'AddHiddenColumn',
        tableId,
        'ulid',
        {
          type: 'Text',
          formula: 'from ulid import ULID; value or IFERROR(str(ULID()))',
          recalcWhen: 2,
          untieColIdFromLabel: true,
          isFormula: false
        }
      ],
      [
        'BulkUpdateRecord',
        tableId,
        docTableData.id,
        {
          temporary_trigger: docTableData.id.map(() => 1)
        }
      ],
      ['RemoveColumn', tableId, 'temporary_trigger']
    )
  }

  // Add RowComments table if missing
  const needsRowCommentsTable = !tables.includes('RowComments')
  if (needsRowCommentsTable) {
    actions.push([
      'AddTable',
      'RowComments',
      [
        { id: 'user', type: 'Text' },
        { id: 'timestamp', type: 'DateTime' },
        { id: 'row_ulid', type: 'Text' },
        { id: 'content', type: 'Text' }
      ]
    ])
  }

  if (actions.length) await grist.docApi.applyUserActions(actions)

  // Remove auto-generated RowComments views
  if (needsRowCommentsTable) {
    const { id, name } = await grist.docApi.fetchTable('_grist_Views')
    const viewsToRemove = id.filter((_, i) => name[i] === 'RowComments')

    if (viewsToRemove.length) {
      await grist.docApi.applyUserActions(
        viewsToRemove.map((id) => ['RemoveView', id])
      )
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
        row_ulid: commentsData.row_ulid[i],
        own: commentsData.Own?.[i]
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

  const createChatBubble = (comment) => {
    const isOwn = comment.own === true
    const userName = comment.user.split('@')[0]
    const deleteButton = `<button class="absolute top-2 right-2 w-4 h-4 rounded-full bg-error/80 hover:bg-error text-white flex items-center justify-center text-xs leading-none opacity-0 hover:opacity-100 transition-opacity z-10" onclick="deleteComment(${comment.id})" title="Delete comment">×</button>`

    return `
      <div class="chat ${isOwn ? 'chat-end' : 'chat-start'} relative group" 
           onmouseenter="this.querySelector('button').style.opacity='1'" onmouseleave="this.querySelector('button').style.opacity='0'">
        <div class="chat-header">
          ${userName} <time class="text-xs opacity-50">${formatTimestamp(comment.timestamp)}</time>
        </div>
        <div class="chat-bubble ${isOwn ? 'chat-bubble-info' : ''}">${comment.content}</div>
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
  await grist.getTable('RowComments').create({
    fields: {
      timestamp: Date.now() / 1000,
      row_ulid: state.currentUlid,
      content
    }
  })

  await loadComments()
}

console.log('Script loaded, looking for form...')
const form = document.getElementById('contentForm')
console.log('Form found:', form)

// Check if there's an initial record selection
console.log('Checking for initial record selection...')
setTimeout(() => {
  console.log('After timeout - current state:', state)
  const submitButton = document.querySelector('button[type="submit"]')
  const contentInput = document.getElementById('contentInput')

  if (submitButton && contentInput) {
    console.log('Initial UI update - button disabled:', !state.currentId)
    submitButton.disabled = !state.currentId
    contentInput.placeholder = state.currentId
      ? 'Enter your comment here...'
      : 'Select a record to add comments...'
  }
}, 1000)

if (form) {
  console.log('Attaching submit handler to form')
  form.addEventListener('submit', async (e) => {
    console.log('Form submitted!', e)
    e.preventDefault()

    const input = e.target.querySelector('#contentInput')
    const content = input.value.trim()
    console.log(
      'Content:',
      content,
      'currentId:',
      state.currentId,
      'currentUlid:',
      state.currentUlid
    )

    const hasValidRecord = !!(state.currentId && state.currentUlid)
    if (!content || !hasValidRecord) {
      console.log(
        'Validation failed - content:',
        content,
        'hasValidRecord:',
        hasValidRecord,
        'currentId:',
        state.currentId,
        'currentUlid:',
        state.currentUlid
      )
      return
    }

    input.value = ''
    try {
      console.log('Adding comment...')
      await addComment(content)
      console.log('Comment added successfully')
    } catch (error) {
      console.error('Error adding comment:', error)
    }
  })
} else {
  console.error('Form not found!')
}
