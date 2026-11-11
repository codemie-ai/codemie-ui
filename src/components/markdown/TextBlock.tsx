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

import React, { useMemo, useRef, useState } from 'react'

import ChevronRightSvg from '@/assets/icons/chevron-right.svg?react'
import { cn } from '@/utils/utils'

interface TextBlockProps {
  text?: string
  className?: string
  collapsible?: boolean
}

const PREVIEW_EDGE_LINES = 20
const MINIMUM_PREVIEW_LINES = 60

const TextBlock: React.FC<TextBlockProps> = ({ text = '', className, collapsible = false }) => {
  const [isExpanded, setIsExpanded] = useState(false)
  const restoreToggleFocus = useRef(false)
  const segments = useMemo(
    () =>
      (text ? text.split(/\\n|\n/).filter((line) => line.length) : []).map((line, position) => ({
        id: position,
        line,
      })),
    [text]
  )
  const hasPreview = collapsible && segments.length >= MINIMUM_PREVIEW_LINES
  const Container = collapsible ? 'div' : 'p'

  const handleToggle = (event: React.MouseEvent<HTMLButtonElement>) => {
    const isClickedButtonFocused = event.currentTarget === document.activeElement
    restoreToggleFocus.current = isClickedButtonFocused
    setIsExpanded((prev) => !prev)
  }

  const restoreDisclosureFocus = (button: HTMLButtonElement | null) => {
    if (button && restoreToggleFocus.current) {
      button.focus()
      restoreToggleFocus.current = false
    }
  }

  return (
    <Container className={cn(className, collapsible && 'flex flex-col')}>
      {hasPreview && !isExpanded ? (
        <>
          {segments.slice(0, PREVIEW_EDGE_LINES).map(({ id, line }) => (
            <div key={id}>{line}</div>
          ))}
          <button
            ref={restoreDisclosureFocus}
            type="button"
            className="flex items-center gap-2 w-full my-2 px-3 py-2 rounded-lg border border-border-structural bg-surface-base-secondary text-xs text-text-primary cursor-pointer hover:bg-surface-interactive-hover focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-border-focus"
            aria-expanded={false}
            onClick={handleToggle}
          >
            <ChevronRightSvg aria-hidden="true" className="size-3 shrink-0" />
            Show {segments.length - PREVIEW_EDGE_LINES * 2} hidden lines
          </button>
          {segments.slice(-PREVIEW_EDGE_LINES).map(({ id, line }) => (
            <div key={id}>{line}</div>
          ))}
        </>
      ) : (
        <>
          {hasPreview && (
            <button
              ref={restoreDisclosureFocus}
              type="button"
              className="flex items-center gap-3 w-full mb-2 p-3 rounded-lg border border-border-structural bg-surface-base-secondary text-xs text-text-primary cursor-pointer hover:bg-surface-interactive-hover focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-border-focus"
              aria-label="Collapse"
              aria-expanded={true}
              onClick={handleToggle}
            >
              <ChevronRightSvg aria-hidden="true" className="size-3 shrink-0 rotate-90" />
              <span className="text-left">Full tool output · {segments.length} lines</span>
              <span className="ml-auto">Collapse</span>
            </button>
          )}
          {segments.map(({ id, line }) => (
            <div key={id}>{line}</div>
          ))}
        </>
      )}
    </Container>
  )
}

export default TextBlock
