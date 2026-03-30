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

import React from 'react'

import ExternalSvg from '@/assets/icons/external.svg?react'
import MCPIconSvg from '@/assets/icons/mcp.svg?react'
import Button from '@/components/Button'
import { ButtonType, ButtonSize } from '@/constants'
import { MCPConfig } from '@/types/entity/mcp'
import { getCategoryColor } from '@/utils/mcp'
import { cn } from '@/utils/utils'

interface MCPMarketplaceCardProps {
  config: MCPConfig
  onSelect: (config: MCPConfig) => void
  isSelected: boolean
  isAlreadyAdded: boolean
}

const CardLogo: React.FC<{ logoUrl?: string; name: string }> = ({ logoUrl, name }) => {
  const [imageError, setImageError] = React.useState(false)

  return (
    <div className="flex-shrink-0 w-12 h-12 rounded border border-border-structural bg-surface-elevated flex items-center justify-center overflow-hidden">
      {logoUrl && !imageError ? (
        <img
          src={logoUrl}
          alt={`${name} logo`}
          className="w-full h-full object-cover"
          onError={() => setImageError(true)}
        />
      ) : (
        <MCPIconSvg className="w-6 h-6 text-text-quaternary" />
      )}
    </div>
  )
}

const CategoryBadges: React.FC<{ categories: string[] }> = ({ categories }) => {
  const visibleCategories = categories.slice(0, 3)
  const hasMoreCategories = categories.length > 3

  if (visibleCategories.length === 0) return null

  return (
    <div className="flex flex-wrap gap-1">
      {visibleCategories.map((category) => (
        <span
          key={category}
          className={cn('px-2 py-0.5 text-xs rounded border', getCategoryColor(category))}
        >
          {category}
        </span>
      ))}
      {hasMoreCategories && (
        <span className="px-2 py-0.5 text-xs rounded bg-surface-elevated text-text-quaternary border border-border-structural">
          +{categories.length - 3}
        </span>
      )}
    </div>
  )
}

const StatusBadges: React.FC<{ isPublic?: boolean; isSystem?: boolean }> = ({
  isPublic,
  isSystem,
}) => (
  <>
    {isPublic && (
      <span className="flex-shrink-0 px-2 py-0.5 text-xs rounded bg-in-progress-tertiary text-in-progress-primary border border-in-progress-primary">
        Public
      </span>
    )}
    {isSystem && (
      <span className="flex-shrink-0 px-2 py-0.5 text-xs rounded bg-interrupted-tertiary text-interrupted-primary border border-interrupted-primary">
        System
      </span>
    )}
  </>
)

const ExternalLinks: React.FC<{ homeUrl?: string; sourceUrl?: string }> = ({
  homeUrl,
  sourceUrl,
}) => (
  <div className="flex items-center gap-2">
    {homeUrl && (
      <a
        href={homeUrl}
        target="_blank"
        rel="noopener noreferrer"
        className="text-text-accent-status hover:text-text-accent-status-hover transition"
        title="Documentation"
      >
        <ExternalSvg className="w-4 h-4" />
      </a>
    )}
    {sourceUrl && (
      <a
        href={sourceUrl}
        target="_blank"
        rel="noopener noreferrer"
        className="text-text-accent-status hover:text-text-accent-status-hover transition"
        title="Source Code"
      >
        <ExternalSvg className="w-4 h-4" />
      </a>
    )}
  </div>
)

const MCPMarketplaceCard: React.FC<MCPMarketplaceCardProps> = ({
  config,
  onSelect,
  isSelected,
  isAlreadyAdded,
}) => {
  return (
    <div
      className={cn(
        'flex flex-col bg-surface-base-secondary border border-border-structural rounded-lg p-4 transition-all',
        'hover:border-specific-interactive-outline',
        isSelected && 'border-in-progress-primary bg-in-progress-tertiary'
      )}
    >
      {/* Header: Logo + Name + Badge */}
      <div className="flex items-start gap-3 mb-3">
        <CardLogo logoUrl={config.logo_url} name={config.name} />

        {/* Name and Badges */}
        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between gap-2 mb-1">
            <h3
              className="text-h3 text-text-primary font-semibold truncate"
              data-tooltip-id="react-tooltip"
              data-tooltip-content={config.name}
            >
              {config.name}
            </h3>
            <StatusBadges isPublic={config.is_public} isSystem={config.is_system} />
          </div>

          <CategoryBadges categories={config.categories} />
        </div>
      </div>

      {/* Description */}
      <p
        className="text-sm text-text-quaternary mb-4 line-clamp-2 min-h-[40px]"
        data-tooltip-id="react-tooltip"
        data-tooltip-content={config.description ?? 'No description available'}
      >
        {config.description ?? 'No description available'}
      </p>

      {/* Footer: Stats + Links + Button */}
      <div className="flex items-center justify-between gap-2 mt-auto">
        {/* Stats */}
        <div className="flex items-center gap-4 text-xs text-text-quaternary">
          {config.usage_count > 0 && (
            <span className="flex items-center gap-1">
              <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z"
                />
              </svg>
              {config.usage_count}
            </span>
          )}
        </div>

        <ExternalLinks homeUrl={config.server_home_url} sourceUrl={config.source_url} />

        {/* Add Button */}
        <Button
          variant={ButtonType.PRIMARY}
          size={ButtonSize.SMALL}
          onClick={() => onSelect(config)}
          disabled={isAlreadyAdded}
          className="ml-auto"
        >
          {isAlreadyAdded ? 'Added' : 'Add'}
        </Button>
      </div>
    </div>
  )
}

export default MCPMarketplaceCard
