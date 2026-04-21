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

import {
  getCommands,
  handleKeyDown,
  shortcuts,
  TextAreaCommandOrchestrator,
} from '@uiw/react-md-editor'
import { useEffect, useRef } from 'react'

import { cn } from '@/utils/utils'

interface MdEditorProps {
  className?: string
  value: string
  onChange: (value: string) => void
}

const MdEditor = ({ className, value, onChange }: MdEditorProps) => {
  const textareaRef = useRef(null)
  const orchestratorRef = useRef<TextAreaCommandOrchestrator>(null)

  useEffect(() => {
    if (textareaRef.current) {
      orchestratorRef.current = new TextAreaCommandOrchestrator(textareaRef.current)
    }
  }, [])

  const onKeyDown = (e) => {
    handleKeyDown(e, 2, false)
    if (orchestratorRef.current) {
      shortcuts(e, getCommands(), orchestratorRef.current)
    }
  }

  return (
    <textarea
      spellCheck={false}
      ref={textareaRef}
      value={value}
      onChange={(e) => onChange(e.target.value)}
      onKeyDown={onKeyDown}
      className={cn(
        'bg-transparent text-sm focus:outline-none hide-scrollbar w-full resize-none',
        className
      )}
    />
  )
}

export default MdEditor
