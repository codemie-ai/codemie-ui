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

import React, { useState, useRef, useEffect } from 'react'

import ActionDeleteSvg from '@/assets/icons/delete.svg?react'
import Button from '@/components/Button'
import { NoteStateConfiguration } from '@/types/workflowEditor/configuration'
import { cn } from '@/utils/utils'
import { NODE_CHANGE_TYPE } from '@/utils/workflowEditor/constants'

import { CommonNodeProps } from './common'

const MIN_HEIGHT = 80
const MAX_HEIGHT = 300
const BOTTOM_MARGIN = 10

export const NoteNode = ({ data, selected, id }: CommonNodeProps) => {
  const state = data.findState(id) as NoteStateConfiguration
  const [content, setContent] = useState(state?._meta?.data?.note || '')

  const textareaRef = useRef<HTMLTextAreaElement>(null)
  const nodeRef = useRef<HTMLDivElement>(null)

  const notifyReactFlowDimensionChange = () => {
    const nodeElement = nodeRef.current
    if (!nodeElement) return

    requestAnimationFrame(() => {
      data.onNodesChange([
        {
          id,
          type: NODE_CHANGE_TYPE.DIMENSIONS,
          dimensions: {
            width: nodeElement.offsetWidth,
            height: nodeElement.offsetHeight + BOTTOM_MARGIN,
          },
          resizing: false,
        },
      ])
    })
  }

  const adjustHeight = () => {
    const textarea = textareaRef.current
    if (textarea) {
      textarea.style.height = `${MIN_HEIGHT}px`
      const newHeight = Math.min(Math.max(textarea.scrollHeight, MIN_HEIGHT), MAX_HEIGHT)
      textarea.style.height = `${newHeight}px`

      notifyReactFlowDimensionChange()
    }
  }

  useEffect(() => {
    adjustHeight()
  }, [])

  const handleDelete = (e: React.MouseEvent) => {
    e.stopPropagation()
    data.removeState(id)
  }

  const handleChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setContent(e.target.value)
    setTimeout(() => adjustHeight(), 0)
  }

  const handleBlur = () => {
    if (content === state._meta?.data?.note) return

    data.updateConfig({
      state: { id, data: { note: content } },
    })
  }

  if (!state) return <></>

  return (
    <div
      ref={nodeRef}
      className={cn(
        'bg-surface-specific-node-note-bg text-text-specific-node-note-text py-6 px-5 w-60 border-1 border-transparent'
      )}
    >
      <div className="flex justify-between">
        <div className="text-lg font-semibold"> Note </div>

        <Button
          variant="tertiary"
          className="hover:!bg-text-specific-node-note-text/20 nodrag nopan nowheel"
          onClick={handleDelete}
        >
          <ActionDeleteSvg className="text-text-specific-node-note-text" />
        </Button>
      </div>

      <textarea
        ref={textareaRef}
        value={content}
        onChange={handleChange}
        onBlur={handleBlur}
        placeholder="Add your note here..."
        className={cn(
          'w-full mt-2.5 p-2 text-base bg-transparent border-1 border-transparent rounded resize-none outline-none text-text-specific-node-note-text placeholder:text-text-specific-node-note-text/50 overflow-y-auto',
          'nodrag nopan nowheel',
          {
            'border-text-specific-node-note-text/50': selected,
            '[&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]':
              !selected,
          }
        )}
      />
    </div>
  )
}
