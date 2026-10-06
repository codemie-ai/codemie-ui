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

import ExpandSvg from '@/assets/icons/expand.svg?react'
import ExternalSvg from '@/assets/icons/external.svg?react'
import HistorySVG from '@/assets/icons/history.svg?react'
import Button from '@/components/Button'
import { ButtonType } from '@/constants'
import { cn } from '@/utils/utils'

export interface WorkflowYamlHeaderActionsProps {
  documentationUrl?: string | null
  showDocumentation?: boolean
  onShowVersionHistory?: (visibleYaml: string) => void
  getVisibleYaml?: () => string
  versionHistoryAriaLabel?: string
  onExpand?: () => void
  expandAriaLabel?: string
  className?: string
}

const WorkflowYamlHeaderActions = ({
  documentationUrl,
  showDocumentation = false,
  onShowVersionHistory,
  getVisibleYaml,
  versionHistoryAriaLabel = 'Version History',
  onExpand,
  expandAriaLabel = 'Expand YAML editor',
  className,
}: WorkflowYamlHeaderActionsProps) => {
  return (
    <div className={cn('ml-auto flex min-w-0 flex-wrap items-center justify-end gap-2', className)}>
      {showDocumentation && documentationUrl ? (
        <a
          href={documentationUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="hover:no-underline"
        >
          <Button variant={ButtonType.SECONDARY} size="medium">
            <ExternalSvg />
            Documentation
          </Button>
        </a>
      ) : null}

      {onShowVersionHistory ? (
        <Button
          variant={ButtonType.SECONDARY}
          size="medium"
          onClick={() => onShowVersionHistory(getVisibleYaml?.() ?? '')}
          aria-label={versionHistoryAriaLabel}
        >
          <HistorySVG />
          Version History
        </Button>
      ) : null}

      {onExpand ? (
        <Button
          variant={ButtonType.SECONDARY}
          size="medium"
          onClick={onExpand}
          aria-label={expandAriaLabel}
        >
          <ExpandSvg />
          Expand
        </Button>
      ) : null}
    </div>
  )
}

export default WorkflowYamlHeaderActions
