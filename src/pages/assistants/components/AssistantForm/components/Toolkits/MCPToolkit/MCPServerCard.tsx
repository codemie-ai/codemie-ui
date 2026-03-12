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

import React, { useEffect, useMemo, useState } from 'react'

import DeleteSvg from '@/assets/icons/delete.svg?react'
import EditSvg from '@/assets/icons/edit.svg?react'
import MCPIconSvg from '@/assets/icons/mcp.svg?react'
import { Checkbox } from '@/components/form/Checkbox'
import NavigationMore from '@/components/NavigationMore'
import { MCPServerDetails } from '@/types/entity/mcp'
import { Setting } from '@/types/entity/setting'
import { getCategoryColor } from '@/utils/mcp'
import { cn } from '@/utils/utils'

import IntegrationSelector from '../IntegrationSelector'
import MCPToolkitTest from './MCPToolkitTest'

interface MCPServerCardProps {
  mcpServer: MCPServerDetails
  isSelected: boolean
  onToggle: () => void
  onEdit: () => void
  onDelete: () => void
  settingsDefinitions: Setting[]
  onSettingsChange: (settings: Setting | undefined) => void
  onAddSettingClick: () => void
}

const MCPServerCard: React.FC<MCPServerCardProps> = ({
  mcpServer,
  isSelected,
  onToggle,
  onEdit,
  onDelete,
  settingsDefinitions,
  onSettingsChange,
  onAddSettingClick,
}) => {
  const [imageError, setImageError] = useState(false)
  const categories = useMemo(() => mcpServer.categories ?? [], [mcpServer.categories])

  const handleImageError = () => {
    setImageError(true)
  }

  const logoUrl = mcpServer.logo_url ?? null

  useEffect(() => {
    setImageError(false)
  }, [logoUrl])

  return (
    <div
      className={cn(
        'flex flex-col gap-3 p-4 rounded-lg border border-border-structural bg-surface-base-secondary transition-all',
        'hover:border-specific-interactive-outline',
        isSelected
      )}
    >
      {/* Header Row */}
      <div className="flex items-start gap-3">
        {/* Checkbox */}
        <div className="flex-shrink-0 pt-3.5">
          <Checkbox checked={isSelected} onChange={onToggle} label="" />
        </div>

        {/* Logo */}
        <div className="flex-shrink-0 w-10 h-10 rounded border border-border-structural bg-surface-base-secondary flex items-center justify-center overflow-hidden">
          {logoUrl && !imageError ? (
            <img
              src={logoUrl}
              alt={`${mcpServer.name} logo`}
              className="w-full h-full object-cover"
              onError={handleImageError}
            />
          ) : (
            <MCPIconSvg className="w-5 h-5 text-text-quaternary" />
          )}
        </div>

        {/* Name and Description */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <h4 className="text-sm font-semibold text-text-primary truncate">{mcpServer.name}</h4>
          </div>
          {mcpServer.description && (
            <p className="text-xs text-text-quaternary line-clamp-2">{mcpServer.description}</p>
          )}
          {/* Selected Tools */}
          {mcpServer.tools && mcpServer.tools.length > 0 && (
            <p className="text-xs text-text-secondary mt-2">
              <span className="font-medium">Selected Tools:</span> {mcpServer.tools.join(', ')}
            </p>
          )}
          {/* Categories */}
          {categories.length > 0 && (
            <div className="flex flex-wrap gap-1 mt-2">
              {categories.slice(0, 3).map((category: string) => (
                <span
                  key={category}
                  className={cn('px-1.5 py-0.5 text-xs rounded border', getCategoryColor(category))}
                >
                  {category}
                </span>
              ))}
            </div>
          )}
        </div>

        {/* Actions Menu */}
        <NavigationMore
          renderInRoot
          alignment="end"
          hideOnClickInside
          items={[
            {
              title: 'Edit',
              icon: <EditSvg />,
              onClick: onEdit,
            },
            {
              title: 'Delete',
              icon: <DeleteSvg />,
              onClick: onDelete,
            },
          ]}
        >
          <MCPToolkitTest inline mcpServer={mcpServer} />
        </NavigationMore>
      </div>

      {/* Integration Selector (shown when enabled) */}
      {isSelected && (
        <div className="pl-4">
          <IntegrationSelector
            value={mcpServer.settings}
            tooltipPosition="left"
            settingsDefinitions={settingsDefinitions}
            addButtonLabel="Add Environment Variables"
            placeholder="Environment Variables"
            onChange={onSettingsChange}
            onAddSettingClick={onAddSettingClick}
          />
        </div>
      )}
    </div>
  )
}

export default MCPServerCard
