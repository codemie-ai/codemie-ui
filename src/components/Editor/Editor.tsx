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

import { Editor as PrimeReactEditor } from 'primereact/editor'
import { forwardRef, useEffect, useImperativeHandle, useMemo, useRef } from 'react'
import { useSnapshot } from 'valtio'

import { assistantsStore } from '@/store'
import { chatsStore } from '@/store/chats'
import { cn } from '@/utils/utils'

import './Editor.scss'

import {
  ChatEditorDelta,
  getEditorModules,
  registerEditorHandlers,
  unregisterEditorHandlers,
} from './quillModules'

export interface EditorValue {
  message: string
  messageRaw: string
}

export interface EditorRef {
  focus: () => void
  getContent: () => ChatEditorDelta
}

const processText = (e: any): EditorValue => {
  const text = e.textValue ?? ''
  const lines = text.split('\n')
  const firstNonEmpty = lines.findIndex((line) => line.trim() !== '')
  const message = firstNonEmpty === -1 ? '' : lines.slice(firstNonEmpty).join('\n').trimEnd()

  const htmlParagraphs = (e.htmlValue ?? '').split('</p>').filter((p) => p.trim())
  const isNonEmpty = (p: string) =>
    p
      .replace(/<\/?p>/g, '')
      .replace(/<br\s*\/?>/g, '')
      .trim() !== ''

  const firstNonEmptyHtml = htmlParagraphs.findIndex(isNonEmpty)
  const lastNonEmptyHtml = htmlParagraphs.map(isNonEmpty).lastIndexOf(true)

  const messageRaw =
    firstNonEmptyHtml === -1
      ? ''
      : htmlParagraphs.slice(firstNonEmptyHtml, lastNonEmptyHtml + 1).join('</p>') + '</p>'

  return { message, messageRaw }
}

interface EditorProps {
  withMentions?: boolean
  value: EditorValue
  variant?: 'default' | 'message'
  placeholder?: string
  className?: string
  disabled?: boolean
  onChange: (value: EditorValue) => void
  onSubmit: () => void
  onAddFiles: (files: File[]) => void
  onFocusChange?: (isFocused: boolean) => void
  onEditorLoad?: (quill: any) => void
}

const Editor = forwardRef<EditorRef, EditorProps>(
  (
    {
      withMentions = true,
      value,
      variant = 'default',
      placeholder,
      className,
      disabled,
      onChange,
      onSubmit,
      onAddFiles,
      onFocusChange,
      onEditorLoad,
    },
    ref
  ) => {
    const { currentChat } = useSnapshot(chatsStore) as typeof chatsStore
    const { getAllAssistantsOptions } = useSnapshot(assistantsStore)

    const editorId = useMemo(() => `editor-${crypto.randomUUID().substring(2, 9)}`, [])
    const editorRef = useRef<PrimeReactEditor>(null)
    const editorModules = getEditorModules({ editorId, enableMentions: withMentions })

    useEffect(() => {
      registerEditorHandlers(editorId, {
        chat: currentChat!,
        onSubmit,
        onAddImg: onAddFiles,
        loadAssistants: getAllAssistantsOptions,
      })

      return () => {
        unregisterEditorHandlers(editorId)
      }
    }, [currentChat?.id, onSubmit, onAddFiles, getAllAssistantsOptions, editorId])

    useEffect(() => {
      const editor = editorRef.current

      return () => {
        const quill = editor?.getQuill?.()
        if (quill) quill.getModule('mention')?.hideMentionList()
      }
    }, [currentChat?.id, editorId])

    useEffect(() => {
      const quill = editorRef.current?.getQuill()
      if (quill && value.messageRaw === '') {
        const currentContent = quill.root.innerHTML
        if (currentContent.trim() !== '') {
          quill.setText('')
        }
      }
    }, [value.messageRaw])

    useImperativeHandle<EditorRef, EditorRef>(ref, () => ({
      focus: () => {
        const quill = editorRef.current?.getQuill()
        if (quill) {
          const length = quill.getLength()
          quill.setSelection(length, 0)
          quill.focus()
        }
      },
      getContent: () => editorRef.current?.getQuill().editor.delta,
    }))

    return (
      <PrimeReactEditor
        value={value.messageRaw}
        ref={editorRef}
        showHeader={false}
        modules={editorModules}
        formats={[withMentions ? 'mention' : '']}
        className={cn(`editor editor-${variant} [&>.ql-toolbar]:!hidden`, className)}
        placeholder={placeholder}
        readOnly={disabled}
        onFocus={() => onFocusChange?.(true)}
        onBlur={() => onFocusChange?.(false)}
        onTextChange={(e) => onChange(processText(e))}
        onLoad={() => {
          const quill = editorRef.current?.getQuill()
          if (quill) {
            quill.root.innerHTML = value.messageRaw
            const length = quill.getLength()
            quill.setSelection(length, 0)
            quill.focus()
            onEditorLoad?.(quill)
          }
        }}
      />
    )
  }
)

export default Editor
