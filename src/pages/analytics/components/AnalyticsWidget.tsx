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

import { FC, ReactNode, useEffect, useRef, useState } from 'react'

import ExpandIcon from '@/assets/icons/expand.svg?react'
import Spinner from '@/components/Spinner'
import type { ErrorDetails } from '@/types/common'
import { cn } from '@/utils/utils'

import WidgetModal from './WidgetModal'

export interface AnalyticsWidgetProps {
  title: string
  description?: string
  children?: ReactNode
  renderContent?: ({ isExpanded }: { isExpanded: boolean }) => ReactNode
  loading?: boolean
  error?: ErrorDetails | null
  className?: string
  actions?: ReactNode
  /**
   * Whether to show expand button for fullscreen view.
   * Default: true
   * Set to false for summary cards and metric displays where fullscreen provides no benefit.
   * Keep true for tables, charts, and detailed visualizations.
   */
  expandable?: boolean
  /**
   * When true, subsequent loads show a light overlay instead of replacing content with a spinner.
   * Use only for widgets where preserving visible data during refresh is important (e.g. leaderboard table).
   */
  softReload?: boolean
  minLoadingHeight?: string
}

const AnalyticsWidget: FC<AnalyticsWidgetProps> = ({
  title,
  description,
  children,
  renderContent,
  loading = false,
  error = null,
  className,
  actions,
  expandable = true,
  softReload = false,
  minLoadingHeight = '80px',
}) => {
  const [isExpanded, setIsExpanded] = useState(false)
  const hasLoadedOnce = useRef(false)
  const wasLoading = useRef(false)
  useEffect(() => {
    if (!softReload) return
    if (loading) {
      wasLoading.current = true
    } else if (wasLoading.current) {
      hasLoadedOnce.current = true
    }
  }, [loading, softReload])

  const renderWrapper = () => {
    if (error) {
      return (
        <div className="flex items-center justify-center py-12">
          <div className="text-center max-w-xl w-full">
            <p className="text-center text-failed-secondary font-semibold mb-2">{error.message}</p>
            {error.help && (
              <p className="text-sm text-text-quaternary break-words mb-2">{error.help}</p>
            )}
          </div>
        </div>
      )
    }

    const content = renderContent ? renderContent({ isExpanded }) : children

    const isFirstLoad = !softReload || !hasLoadedOnce.current

    return (
      <div className="relative" style={{ minHeight: minLoadingHeight }}>
        {loading && isFirstLoad && (
          <div className="absolute inset-0 z-10 flex items-center justify-center rounded-lg bg-surface-base-secondary/70">
            <div className="flex flex-col items-center gap-2">
              <Spinner inline className="w-6 h-6" />
              <p className="text-xs text-text-quaternary">Loading data...</p>
            </div>
          </div>
        )}
        {loading && !isFirstLoad && (
          <div className="absolute inset-0 z-10 rounded-lg bg-surface-base-secondary/40 pointer-events-none" />
        )}
        <div className={cn(loading && isFirstLoad && 'opacity-0 pointer-events-none')}>
          {content}
        </div>
      </div>
    )
  }

  return (
    <div
      className={cn(
        'bg-surface-base-secondary rounded-lg border border-border-specific-panel-outline p-6',
        className
      )}
    >
      <div className="flex items-start justify-between mb-4">
        <div className="flex-1">
          <h3 className="text-lg font-semibold text-text-primary">{title}</h3>
          {description && <p className="text-sm text-text-quaternary mt-1">{description}</p>}
        </div>
        <div className="flex items-center gap-2 ml-4">
          {actions}
          {expandable && (
            <button
              onClick={() => setIsExpanded(true)}
              className="p-2 rounded-lg text-text-quaternary hover:text-text-primary hover:bg-hover transition-colors"
              aria-label="Expand widget"
              title="Expand to fullscreen"
            >
              <ExpandIcon className="w-5 h-5" />
            </button>
          )}
        </div>
      </div>

      <div className="widget-content min-w-0">{renderWrapper()}</div>

      <WidgetModal
        visible={isExpanded}
        onHide={() => setIsExpanded(false)}
        title={title}
        description={description}
        actions={actions}
      >
        {renderWrapper()}
      </WidgetModal>
    </div>
  )
}

export default AnalyticsWidget
