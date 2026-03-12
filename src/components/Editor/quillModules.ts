// Copyright 2026 EPAM Systems, Inc. ("EPAM")
//
// Licensed under the Apache License, Version 2.0 (the "License");
// you may not use this file except in compliance with the License.
// You may obtain a copy of the License at
//
//     http://www.apache.org/licenses/LICENSE-2.0
//
// Unless required by applicable law or agreed to in writing, software
// distributed under the License is distributed on an "AS IS" BASIS,
// WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
// See the License for the specific language governing permissions and
// limitations under the License.
//

import defaultAvatar from '@/assets/images/ai-avatar.png'
import { Conversation } from '@/types/entity/conversation'
import { generateAssistantAvatarDataUrl } from '@/utils/assistantAvatar'
import { decodeFileName } from '@/utils/utils'

interface AssistantItem {
  id: string
  value: string
  icon?: string
  owner: string
  denotationChar?: string
  type: 'assistant'
}

interface FileItem {
  id: string
  value: string
  type: 'file'
}

type MentionItem = AssistantItem | FileItem

interface MentionElement extends HTMLElement {
  style: CSSStyleDeclaration
  classList: DOMTokenList
}

interface ChatMessage {
  fileNames?: string[]
}

interface EditorModulesProps {
  editorId: string
  enableMentions: boolean
}

interface EditorHandlers {
  onSubmit: () => void
  onAddImg: (files: File[]) => void
  loadAssistants: (searchTerm: string) => Promise<any[]>
  chat: Conversation
}

const editorRegistry = new Map<string, EditorHandlers>()

export const registerEditorHandlers = (id: string, handlers: EditorHandlers) => {
  editorRegistry.set(id, handlers)
}

export const unregisterEditorHandlers = (id: string) => {
  editorRegistry.delete(id)
}

const getEditorHandlers = (id: string): EditorHandlers | undefined => {
  return editorRegistry.get(id)
}

const SYSTEM_OWNER = 'System'
const ITEM_TYPES = {
  ASSISTANT: 'assistant',
  FILE: 'file',
} as const

const FILE_ICON_SVG =
  '<svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"></path></svg>'

const isMentionElement = (element: Element): element is MentionElement => {
  return element instanceof HTMLElement
}

const isAssistantItem = (item: MentionItem): item is AssistantItem => {
  return item.type === ITEM_TYPES.ASSISTANT
}

const isFileItem = (item: MentionItem): item is FileItem => {
  return item.type === ITEM_TYPES.FILE
}

const styleMention = (mentionElement: MentionElement | null, data: MentionItem | null): void => {
  if (!mentionElement || !data) return

  if (isAssistantItem(data)) {
    const defaultIcon = generateAssistantAvatarDataUrl(data.value) || defaultAvatar
    const iconUrl = data.icon === '' ? defaultIcon : data.icon ?? defaultIcon
    mentionElement.style.setProperty('--mention-avatar', `url("${iconUrl}")`)
    mentionElement.classList.add('mention-assistant')
  } else if (isFileItem(data)) {
    mentionElement.classList.add('mention-file')
  }
}

// MENTION LIST
const renderAssistantListItem = (item: AssistantItem) => {
  const container = document.createElement('div')
  container.className = 'flex items-center w-full'

  const img = document.createElement('img')
  img.className = 'ql-ml-item-img'
  img.src = item.icon === '' ? defaultAvatar : item.icon ?? defaultAvatar

  const textContainer = document.createElement('div')
  textContainer.className = 'ql-ml-item-text'

  const label = document.createElement('p')
  label.className = 'ql-ml-item-text-label'
  label.textContent = item.value

  const description = document.createElement('p')
  description.className = 'ql-ml-item-text-description'
  description.textContent = item.owner

  textContainer.append(label, description)
  container.append(img, textContainer)

  return container
}

const renderFileListItem = (item: FileItem) => {
  const container = document.createElement('div')
  container.className = 'flex items-center w-full'

  const fileIcon = document.createElement('div')
  fileIcon.className = 'ql-ml-item-icon'
  fileIcon.innerHTML = FILE_ICON_SVG

  const textContainer = document.createElement('div')
  textContainer.className = 'ql-ml-item-text'

  const label = document.createElement('p')
  label.className = 'ql-ml-item-text-label'
  label.textContent = item.value

  textContainer.append(label)
  container.append(fileIcon, textContainer)

  return container
}

const extractFileItems = (history: ChatMessage[][] | undefined): FileItem[] => {
  if (!history) return []

  const seenFiles = new Set<string>()
  const fileItems: FileItem[] = []

  history.flat().forEach((message) => {
    if (!message?.fileNames?.length) return

    message.fileNames.forEach((fileName: string) => {
      if (seenFiles.has(fileName)) return

      const { originalFileName } = decodeFileName(fileName) ?? []
      if (originalFileName) {
        seenFiles.add(fileName)
        fileItems.push({
          id: `file-${originalFileName}`,
          value: originalFileName,
          type: ITEM_TYPES.FILE,
        })
      }
    })
  })

  return fileItems.sort((a, b) => a.value.localeCompare(b.value))
}

export const getEditorModules = ({ editorId, enableMentions }: EditorModulesProps) => {
  const modules: Record<string, object> = {
    keyboard: {
      bindings: {
        ENTER: {
          key: 'Enter',
          handler: () => {
            // Check if the mention list is currently open
            // quill-mention creates a container with class 'ql-mention-list-container'
            const mentionList = document.querySelector('.ql-mention-list-container')
            if (mentionList) {
              // If mention list is open, don't submit - let quill-mention handle selection
              return true
            }

            const handlers = getEditorHandlers(editorId)
            if (handlers) handlers.onSubmit()
            return false
          },
        },
        // Disable Tab key handling in Quill to allow natural browser focus navigation
        // This prevents keyboard trap and allows Tab to move focus to next element
        tab: false,
      },
    },
    toolbar: {},

    clipboard: {
      matchers: [
        [
          Node.TEXT_NODE,
          (node: any, delta: any) => {
            if (typeof node.data === 'string') {
              const text = node.data
              return { ops: [{ insert: text }] }
            }
            return delta
          },
        ],
      ],
    },

    imageDropAndPaste: {
      handler: (() => {
        let pendingFiles: File[] = []
        let timeoutId: NodeJS.Timeout | null = null
        return (_, __, imageData: { toFile: () => File }) => {
          pendingFiles.push(imageData.toFile())

          if (timeoutId) clearTimeout(timeoutId)
          timeoutId = setTimeout(() => {
            const handlers = getEditorHandlers(editorId)
            if (handlers) handlers.onAddImg(pendingFiles)
            pendingFiles = []
            timeoutId = null
          }, 0)
        }
      })(),
      autoConvert: false,
    },
  }

  if (enableMentions) {
    modules.mention = {
      allowedChars: /^.*$/,
      mentionDenotationChars: ['@'],
      positioningStrategy: 'fixed',
      mentionContainerClass:
        'bg-surface-base-secondary max-w-xs max-h-40 border border-border-specific-panel-outline rounded-lg shadow-lg overflow-y-auto font-geist-mono p-2',
      defaultMenuOrientation: 'top',
      listItemClass: 'ql-ml-item',
      dataAttributes: [
        'id',
        'value',
        'denotationChar',
        'link',
        'target',
        'disabled',
        'type',
        'icon',
      ],

      source: (
        searchTerm: string,
        renderList: (items: MentionItem[], searchTerm: string) => void
      ) => {
        const handlers = getEditorHandlers(editorId)
        if (!handlers) return

        handlers.loadAssistants(searchTerm).then((assistants) => {
          const assistantItems: AssistantItem[] = assistants.map((assistant) => ({
            id: assistant.id,
            value: assistant.name,
            icon: assistant.icon_url || generateAssistantAvatarDataUrl(assistant.name),
            owner: assistant.created_by?.username ?? assistant.created_by?.id ?? SYSTEM_OWNER,
            type: ITEM_TYPES.ASSISTANT,
          }))

          const fileItems = extractFileItems(handlers.chat?.history as any)
          const fileMatches =
            searchTerm.length === 0
              ? fileItems
              : fileItems.filter((entry) =>
                  entry.value.toLowerCase().includes(searchTerm.toLowerCase())
                )
          const values: MentionItem[] = [...fileMatches, ...assistantItems]

          renderList(values, searchTerm)
        })
      },

      renderItem(item: MentionItem) {
        if (isAssistantItem(item)) {
          return renderAssistantListItem(item)
        }
        if (isFileItem(item)) {
          return renderFileListItem(item)
        }

        return document.createElement('div')
      },

      onSelect(item: MentionItem, insertItem: (item: MentionItem) => void) {
        const modifiedItem: MentionItem = isAssistantItem(item)
          ? { ...item, denotationChar: '' }
          : item

        insertItem(modifiedItem)

        setTimeout(() => {
          const mentions = document.querySelectorAll(
            `.mention[data-id="${item.id}"], .mention[data-value="${item.value}"]`
          )

          if (mentions.length === 0) {
            const allMentions = document.querySelectorAll('.mention')
            if (allMentions.length > 0) {
              const lastMention = allMentions[allMentions.length - 1]
              if (lastMention && isMentionElement(lastMention)) {
                styleMention(lastMention, item)
              }
            }
          } else {
            mentions.forEach((mention) => {
              if (isMentionElement(mention)) styleMention(mention, item)
            })
          }
        }, 50)
      },
    }
  }

  return modules
}

interface MentionPosition {
  mentionData: MentionOp['mention']
  position: number
}

interface MentionOp {
  mention: {
    denotationChar: ''
    index: string
    icon: string
    type: 'file' | 'assistant'
    id: string
    value: string
    [key: string]: any
  }
}

interface DeltaOp {
  insert: string | MentionOp | Record<string, any>
}

export interface ChatEditorDelta {
  ops: DeltaOp[]
}

export const getMessageTextWithMentions = (delta: ChatEditorDelta, messageText: string): string => {
  let index = 0
  const mentions: MentionPosition[] = []

  delta.ops.forEach((op) => {
    if (typeof op.insert === 'string') {
      index += op.insert.length
    } else if (typeof op.insert === 'object' && op.insert !== null && 'mention' in op.insert) {
      const mentionOp = op.insert as MentionOp

      mentions.push({
        mentionData: mentionOp.mention,
        position: index,
      })
      index += 1
    } else {
      index += 1
    }
  })

  mentions.reverse()
  return mentions.reduce((text, mention) => {
    if (mention.mentionData.type === 'file') {
      const placeholder = `${mention.mentionData.value} `
      return text.slice(0, mention.position) + placeholder + text.slice(mention.position)
    }
    return text
  }, messageText)
}

export const getAssistantMentions = (rawText: string) => {
  const tempDiv = document.createElement('div')
  tempDiv.innerHTML = rawText

  // Select all elements with the class 'mention'
  const mentions = tempDiv.querySelectorAll('.mention')
  // Extract the value of the data-id attribute from each element that has data-type='assistant'
  return Array.from(mentions)
    .filter((mention) => mention.getAttribute('data-type') === 'assistant')
    .map((mention) => mention.getAttribute('data-id'))
    .filter((id) => id !== null)
}

export const getAnyMentions = (rawText: string) => {
  const tempDiv = document.createElement('div')
  tempDiv.innerHTML = rawText

  // Select all elements with the class 'mention'
  const mentions = tempDiv.querySelectorAll('.mention')
  return Array.from(mentions)
    .map((mention) => mention.getAttribute('data-id'))
    .filter((id) => id !== null)
}
