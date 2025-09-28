import { Editor } from '@tiptap/core'
import StarterKit from '@tiptap/starter-kit'
import Underline from '@tiptap/extension-underline'
import { BubbleMenu } from '@tiptap/extension-bubble-menu'

let editor, column, id, lastContent, lastSave

// Create the menu element but don't add it to DOM yet
const bubbleMenuElement = document.createElement('div')
bubbleMenuElement.className = 'bg-white border border-gray-300 rounded-md shadow-lg p-1 flex gap-0.5 z-[1000]'
bubbleMenuElement.innerHTML = `
    <button class="bg-transparent border-0 rounded px-2 py-1.5 cursor-pointer text-sm font-medium text-gray-700 hover:bg-gray-100" data-action="toggleBold" title="Bold">B</button>
    <button class="bg-transparent border-0 rounded px-2 py-1.5 cursor-pointer text-sm font-medium text-gray-700 hover:bg-gray-100" data-action="toggleItalic" title="Italic">I</button>
    <button class="bg-transparent border-0 rounded px-2 py-1.5 cursor-pointer text-sm font-medium text-gray-700 hover:bg-gray-100" data-action="toggleUnderline" title="Underline">U</button>
    <button class="bg-transparent border-0 rounded px-2 py-1.5 cursor-pointer text-sm font-medium text-gray-700 hover:bg-gray-100" data-action="toggleBulletList" title="Bullet List">•</button>
    <button class="bg-transparent border-0 rounded px-2 py-1.5 cursor-pointer text-sm font-medium text-gray-700 hover:bg-gray-100" data-action="toggleOrderedList" title="Numbered List">1.</button>
`

const getMarkName = action => ({
  toggleBold: 'bold',
  toggleItalic: 'italic',
  toggleUnderline: 'underline',
  toggleBulletList: 'bulletList',
  toggleOrderedList: 'orderedList'
})[action]

editor = new Editor({
  element: document.querySelector('#editor'),
  extensions: [
    StarterKit,
    Underline,
    BubbleMenu.configure({
      element: bubbleMenuElement,
      shouldShow: ({ editor, view, state, oldState, from, to }) => {
        // Only show if there's a text selection (not just cursor)
        return from !== to
      }
    })
  ],
  content: '<p></p>',
  onUpdate: () => saveContent(),
  onSelectionUpdate: ({ editor }) => {
    // Update button states when selection changes
    bubbleMenuElement.querySelectorAll('button').forEach(button => {
      const isActive = editor.isActive(getMarkName(button.dataset.action))
      if (isActive) {
        button.className = 'bg-blue-100 text-blue-800 border-0 rounded px-2 py-1.5 cursor-pointer text-sm font-medium'
      } else {
        button.className = 'bg-transparent border-0 rounded px-2 py-1.5 cursor-pointer text-sm font-medium text-gray-700 hover:bg-gray-100'
      }
    })
  }
})

bubbleMenuElement.addEventListener('click', e => {
  if (e.target.tagName === 'BUTTON') {
    const action = e.target.dataset.action
    editor.chain().focus()[action]().run()
  }
})

grist.ready({ requiredAccess: 'full', columns: [{ name: 'Content', type: 'Text' }] })

grist.onRecord((record, mappings) => {
  editor.setEditable(true)
  if (id !== record.id || mappings?.Content !== column) {
    id = record.id
    column = mappings?.Content
    const mapped = grist.mapColumnNames(record)
    if (mapped && lastContent !== mapped.Content) {
      const content = mapped.Content || '<p></p>'
      lastContent = content
      editor.commands.setContent(content)
    }
  }
})

grist.onNewRecord(() => {
  id = null
  lastContent = null
  editor.commands.setContent('<p></p>')
  editor.setEditable(false)
})

const table = grist.getTable()

function saveContent () {
  if (lastSave || !column || !id) return
  const content = editor.getHTML()
  if (content === lastContent) return
  lastContent = content
  lastSave = table.update({ id, fields: { [column]: lastContent } }).finally(() => lastSave = null)
}
