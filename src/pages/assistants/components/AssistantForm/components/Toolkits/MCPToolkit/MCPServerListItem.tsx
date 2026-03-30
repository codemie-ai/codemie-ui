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

import { useRef } from 'react'

import MCPIconSvg from '@/assets/icons/mcp.svg?react'
import { useIsTruncated } from '@/hooks/useIsTruncated'
import { MCPServerDetails } from '@/types/entity/mcp'
import { cn } from '@/utils/utils'

interface MCPServerListItemProps {
  server: MCPServerDetails
  index: number
  selectedIndex: number
  isCompactView?: boolean
  onClick: () => void
}

const MCPServerListItem = ({
  server,
  index,
  selectedIndex,
  isCompactView,
  onClick,
}: MCPServerListItemProps) => {
  const labelRef = useRef<HTMLHeadingElement>(null)
  const isTruncated = useIsTruncated(labelRef)

  return (
    <div
      onClick={onClick}
      className={cn(
        'flex items-center p-3 gap-3 rounded-lg cursor-pointer transition-all border min-w-0',
        isCompactView ? 'w-[207px]' : 'w-[280px]',
        selectedIndex === index
          ? 'bg-surface-base-float border-border-structural'
          : 'border-transparent hover:bg-border-structural/10'
      )}
    >
      <div className="flex-shrink-0 w-8 h-8 rounded border border-border-structural bg-surface-base-secondary flex items-center justify-center overflow-hidden">
        {server.logo_url ? (
          <img src={server.logo_url} alt={server.name} className="w-full h-full object-cover" />
        ) : (
          <MCPIconSvg className="w-5 h-5 text-text-quaternary" />
        )}
      </div>
      <div className="flex-1 min-w-0">
        <h2
          ref={labelRef}
          className="font-geist-mono font-medium text-base text-text-primary truncate"
          data-tooltip-id={isTruncated ? 'react-tooltip' : undefined}
          data-tooltip-content={isTruncated ? server.name : undefined}
        >
          {server.name}
        </h2>
      </div>
    </div>
  )
}

export default MCPServerListItem
