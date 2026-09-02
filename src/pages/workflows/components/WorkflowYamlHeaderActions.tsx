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

import ExternalSvg from '@/assets/icons/external.svg?react'
import HistorySVG from '@/assets/icons/history.svg?react'
import Button from '@/components/Button'
import { ButtonType } from '@/constants'

export interface WorkflowYamlHeaderActionsProps {
  documentationUrl?: string | null
  showDocumentation?: boolean
  onShowVersionHistory?: (visibleYaml: string) => void
  getVisibleYaml?: () => string
  versionHistoryAriaLabel?: string
}

const WorkflowYamlHeaderActions = ({
  documentationUrl,
  showDocumentation = false,
  onShowVersionHistory,
  getVisibleYaml,
  versionHistoryAriaLabel = 'Version History',
}: WorkflowYamlHeaderActionsProps) => {
  return (
    <div className="ml-auto flex shrink-0 items-center gap-2">
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
    </div>
  )
}

export default WorkflowYamlHeaderActions
