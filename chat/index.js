import '../shared/tailwind.css'

grist.ready({ requiredAccess: 'full', columns: [{ name: 'Content', type: 'Text' }] })

let contentData = ''
let currentId = null
let currentColumn = null

grist.onRecord(async (record, mappings) => {
  currentId = record.id
  currentColumn = mappings?.Content
  const mapped = grist.mapColumnNames(record)
  contentData = mapped?.Content || ''
  updateForm()
})

function updateForm () {
  const contentInput = document.getElementById('contentInput')
  const submitButton = document.querySelector('button[type="submit"]')
  
  if (contentInput) {
    contentInput.value = contentData
  }
  
  if (submitButton) {
    if (currentId && currentColumn) {
      submitButton.disabled = false
      contentInput.placeholder = 'Enter your content here...'
    } else {
      submitButton.disabled = true
      contentInput.placeholder = 'Select a record to edit content...'
    }
  }
}

function showToast(message, type = 'info') {
  // Remove existing toast
  const existingToast = document.querySelector('.toast')
  if (existingToast) {
    existingToast.remove()
  }

  const toastColors = {
    success: 'alert-success',
    error: 'alert-error',
    info: 'alert-info',
    warning: 'alert-warning'
  }

  const toast = document.createElement('div')
  toast.className = 'toast toast-end'
  toast.innerHTML = `
    <div class="alert ${toastColors[type] || toastColors.info}">
      <span>${message}</span>
    </div>
  `
  
  document.body.appendChild(toast)
  
  // Auto remove after 3 seconds
  setTimeout(() => {
    toast.remove()
  }, 3000)
}

function setButtonState(button, loading = false) {
  if (loading) {
    button.disabled = true
    button.innerHTML = `<span class="loading loading-spinner loading-sm"></span> Updating...`
  } else {
    button.disabled = false
    button.innerHTML = `Update Content`
  }
}

const table = grist.getTable()

function setupForm () {
  const form = document.getElementById('contentForm')
  const contentInput = document.getElementById('contentInput')
  const submitButton = form?.querySelector('button[type="submit"]')

  if (form && contentInput && submitButton) {
    form.addEventListener('submit', async (e) => {
      e.preventDefault()

      const newContent = contentInput.value

      try {
        setButtonState(submitButton, true)
        
        if (currentId && currentColumn) {
          await table.update({ id: currentId, fields: { [currentColumn]: newContent } })
          contentData = newContent
          showToast('Content updated successfully!', 'success')
        } else {
          throw new Error('No row selected')
        }
      } catch (error) {
        console.error('Error updating content:', error)
        showToast('Failed to update content. Please try again.', 'error')
      } finally {
        setButtonState(submitButton, false)
      }
    })

    updateForm()
  }
}

document.addEventListener('DOMContentLoaded', setupForm)
