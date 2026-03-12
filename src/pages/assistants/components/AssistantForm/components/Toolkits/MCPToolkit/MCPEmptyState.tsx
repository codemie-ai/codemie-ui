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

import React, { useRef, useState, useEffect } from 'react'

import MCPIconSvg from '@/assets/icons/mcp.svg?react'
import TemplatesSvg from '@/assets/icons/templates.svg?react'
import ToolSvg from '@/assets/icons/tool.svg?react'
import Button from '@/components/Button'
import TooltipButton from '@/components/TooltipButton'
import { ButtonType } from '@/constants'
import { cn } from '@/utils/utils'

interface MCPEmptyStateProps {
  onBrowseMarketplace: () => void
  onAddCustom: () => void
}

const NARROW_THRESHOLD = 500
const DESCRIPTION =
  'Get started by installing your first MCP server from our catalog or configuring one manually.'

const MCPEmptyState: React.FC<MCPEmptyStateProps> = ({ onBrowseMarketplace, onAddCustom }) => {
  const observerRef = useRef<HTMLDivElement>(null)
  const [isNarrow, setIsNarrow] = useState(false)

  useEffect(() => {
    const observer = observerRef.current
    if (!observer) return () => {}

    let timeoutId: number | undefined

    const resizeObserver = new ResizeObserver((entries) => {
      if (timeoutId !== undefined) {
        clearTimeout(timeoutId)
      }
      timeoutId = window.setTimeout(() => {
        // nosonar
        for (const entry of entries) {
          const { width } = entry.contentRect
          setIsNarrow(width < NARROW_THRESHOLD)
        }
      }, 100)
    })

    resizeObserver.observe(observer)

    return () => {
      if (timeoutId !== undefined) clearTimeout(timeoutId)
      resizeObserver.disconnect()
    }
  }, [])

  return (
    <div ref={observerRef} className="w-full">
      <div
        className={cn(
          'flex flex-col items-center justify-center text-center',
          !isNarrow && 'py-12 px-6'
        )}
      >
        <div
          className={cn(
            'rounded-full bg-surface-base-chat border border-border-structural',
            isNarrow ? 'mb-4 p-3' : 'mb-6 p-6'
          )}
        >
          <MCPIconSvg className={cn('text-text-quaternary', isNarrow ? 'w-8 h-8' : 'w-16 h-16')} />
        </div>

        <h3
          className={cn('text-text-primary mb-2 font-semibold', isNarrow ? 'text-lg' : 'text-h2')}
        >
          No MCP Servers Installed
          {isNarrow && (
            <TooltipButton className="ml-2 mb-[3px] align-middle" content={DESCRIPTION} />
          )}
        </h3>

        {!isNarrow && <p className="text-text-quaternary text-sm max-w-md mb-6">{DESCRIPTION}</p>}

        <div
          className={cn(
            'flex flex-wrap justify-center',
            isNarrow ? 'flex-col gap-2 w-full' : 'flex-row gap-3'
          )}
        >
          <Button
            variant={ButtonType.PRIMARY}
            onClick={onBrowseMarketplace}
            className={cn(isNarrow && 'w-full')}
          >
            <TemplatesSvg className={cn(isNarrow ? 'w-3.5 h-3.5' : 'w-4 h-4')} />
            Browse Catalog
          </Button>
          <Button
            variant={ButtonType.SECONDARY}
            onClick={onAddCustom}
            className={cn(isNarrow && 'w-full')}
          >
            <ToolSvg className={cn(isNarrow ? 'w-3.5 h-3.5' : 'w-4 h-4')} />
            Manual Setup
          </Button>
        </div>
      </div>
    </div>
  )
}

export default MCPEmptyState
