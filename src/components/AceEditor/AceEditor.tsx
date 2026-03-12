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

import ace from 'ace-builds'
import React, { useEffect, useRef } from 'react'

import 'ace-builds/src-noconflict/mode-yaml'
import 'ace-builds/src-noconflict/mode-json'
import 'ace-builds/src-noconflict/theme-tomorrow_night'
import 'ace-builds/src-noconflict/theme-tomorrow'
import { useTheme } from '@/hooks/useTheme'
import { cn } from '@/utils/utils'

interface AceEditorProps {
  value: string
  onChange?: (value: string) => void
  lang?: string
  readonly?: boolean
  name?: string
  className?: string
  placeholder?: string
}

const AceEditor: React.FC<AceEditorProps> = ({
  value,
  onChange,
  lang = 'yaml',
  readonly = false,
  name = 'ace_editor',
  className,
  placeholder,
}) => {
  const { isDark } = useTheme()
  const containerRef = useRef<HTMLDivElement>(null)
  const editorRef = useRef<ace.Ace.Editor | null>(null)
  const valueRef = useRef(value)

  useEffect(() => {
    valueRef.current = value
  }, [value])

  useEffect(() => {
    if (!containerRef.current) {
      return () => {}
    }

    const editor = ace.edit(containerRef.current, {
      mode: `ace/mode/${lang}`,
      theme: `ace/theme/${isDark ? 'tomorrow_night' : 'tomorrow'}`,
      value,
      readOnly: readonly,
      fontSize: 14,
      fontFamily: 'Geist',
      showPrintMargin: false,
      highlightActiveLine: !readonly,
      highlightGutterLine: !readonly,
      useWorker: false,
      placeholder: placeholder || '',
    })

    editorRef.current = editor

    editor.commands.addCommand({
      name: 'copy',
      bindKey: { win: 'Ctrl-C', mac: 'Command-C' },
      exec: (editor: ace.Ace.Editor) => {
        const selectedText = editor.getSelectedText()
        if (selectedText) {
          navigator.clipboard.writeText(selectedText)
        }
      },
    })

    editor.on('change', () => {
      const newValue = editor.getValue()
      if (onChange && newValue !== valueRef.current) {
        onChange(newValue)
      }
    })

    return () => {
      editor.destroy()
    }
  }, [])

  useEffect(() => {
    if (editorRef.current) {
      editorRef.current.setTheme(`ace/theme/${isDark ? 'tomorrow_night' : 'tomorrow'}`)
    }
  }, [isDark])

  useEffect(() => {
    if (editorRef.current && value !== editorRef.current.getValue()) {
      const cursorPosition = editorRef.current.getCursorPosition()
      editorRef.current.setValue(value, -1)
      editorRef.current.moveCursorToPosition(cursorPosition)
    }
  }, [value])

  useEffect(() => {
    if (editorRef.current) {
      editorRef.current.setReadOnly(readonly)
    }
  }, [readonly])

  return (
    <div
      ref={containerRef}
      className={cn('text-sm rounded-xl w-full h-full [&_div]:!font-geist-mono', className)}
      data-name={name}
    />
  )
}

export default AceEditor
