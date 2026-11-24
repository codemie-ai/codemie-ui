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

import { useMemo } from 'react'
import { useSnapshot } from 'valtio'

import CodeSVG from '@/assets/icons/code.svg?react'
import ExternalSvg from '@/assets/icons/external.svg?react'
import HistorySVG from '@/assets/icons/history.svg?react'
import RevertSVG from '@/assets/icons/revert.svg?react'
import SidebarSVG from '@/assets/icons/sidebar.svg?react'
import StatusFailedSvg from '@/assets/icons/status-failed.svg?react'
import WorkflowSVG from '@/assets/icons/workflow.svg?react'
import Button from '@/components/Button'
import { ButtonType } from '@/constants'
import { useWorkflowContractsEnabled } from '@/hooks/useFeatureFlags'
import { appInfoStore } from '@/store/appInfo'
import { isConfigItemEnabled, getConfigItemSettings } from '@/utils/settings'
import {
  ISSUE_SEVERITY,
  IssueSeverityConfig,
  worstSeverity,
} from '@/utils/workflowEditor/helpers/issueSeverity'

import { PanelTabId, TAB_DATA } from './constants'
import { useWorkflowContext } from './hooks/useWorkflowContext'

interface EditorActionsProps {
  withDocs?: boolean
  isFullscreen: boolean
  canUndo: boolean
  hasValidationErrors: boolean
  onUndo: () => void
  onLoadExample?: () => void
  onBeautify: () => void
  onShowVisualVersionHistory?: () => void
  tabs: PanelTabId[]
  toggleTabs: (tabs: PanelTabId[]) => void
}

const BUTTON_LABELS = {
  YAML: 'YAML',
  WORKFLOW_CONFIG: 'Workflow Config',
  UNDO: 'Undo',
  ISSUES: 'Issues',
  CHECK: 'Check',
}

// Red keeps the delete look; amber reuses the warning (`aborted`) tokens, grey stays neutral.
const ISSUES_BUTTON_STYLE: Record<
  IssueSeverityConfig['buttonColor'],
  { variant?: ButtonType; className?: string }
> = {
  red: { variant: ButtonType.DELETE },
  amber: {
    variant: ButtonType.SECONDARY,
    className:
      'border-aborted-secondary text-aborted-secondary bg-aborted-secondary/10 hover:bg-aborted-secondary/20 hover:border-aborted-secondary',
  },
  grey: { variant: ButtonType.SECONDARY },
}

const EditorActions = ({
  withDocs,
  isFullscreen,
  canUndo,
  onUndo,
  onLoadExample,
  onBeautify,
  onShowVisualVersionHistory,
  tabs,
  toggleTabs,
}: EditorActionsProps) => {
  const { issues, isIssueResolved, onCheck, isChecking, isCheckLocked } = useWorkflowContext()
  // Check exists for contract findings; without contract analysis it would report a false clean.
  const [contractsEnabled] = useWorkflowContractsEnabled()
  const { unresolvedCount, buttonColor } = useMemo(() => {
    const list = issues ?? []
    const worst = worstSeverity(list, isIssueResolved)
    return {
      unresolvedCount: list.filter((issue) => !isIssueResolved(issue)).length,
      buttonColor: worst ? ISSUE_SEVERITY[worst].buttonColor : 'grey',
    } as const
  }, [issues, isIssueResolved])
  const issuesButtonStyle = ISSUES_BUTTON_STYLE[buttonColor]
  const { configs } = useSnapshot(appInfoStore)
  const isYamlTabVisible = tabs.includes(TAB_DATA.YAML.ID)
  const isConfigTabVisible = tabs[0] === TAB_DATA.CONFIGURATION.ID

  const isDocumentationEnabled = isConfigItemEnabled(configs, 'workflowDocumentation')
  const documentationUrl = getConfigItemSettings(configs, 'workflowDocumentation')?.url

  return (
    // Below lg the toolbar spans the editor and scrolls sideways when the buttons do not fit;
    // the auto margin keeps them right-aligned whenever they do.
    <div className="absolute top-4 right-4 z-10 flex gap-4 max-lg:left-4 max-lg:gap-2 max-lg:overflow-x-auto max-lg:[&>*]:shrink-0 max-lg:[&>:first-child]:ml-auto">
      {onCheck && contractsEnabled && (
        <Button
          type={ButtonType.SECONDARY}
          onClick={onCheck}
          disabled={isChecking || isCheckLocked}
        >
          {BUTTON_LABELS.CHECK}
        </Button>
      )}

      {issues !== null && (
        <Button
          variant={issuesButtonStyle.variant}
          className={issuesButtonStyle.className}
          data-severity={buttonColor}
          onClick={() => toggleTabs([TAB_DATA.ISSUES.ID])}
          type={tabs.includes(TAB_DATA.ISSUES.ID) ? ButtonType.PRIMARY : ButtonType.SECONDARY}
        >
          <StatusFailedSvg />
          {BUTTON_LABELS.ISSUES}
          {unresolvedCount > 0 && <span>{unresolvedCount}</span>}
        </Button>
      )}

      {isDocumentationEnabled && documentationUrl && withDocs && (
        <a
          href={documentationUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="hover:no-underline"
        >
          <Button type="secondary">
            <ExternalSvg />
            Documentation
          </Button>
        </a>
      )}

      {onLoadExample && (
        <Button type="secondary" onClick={onLoadExample} aria-label="Load Example">
          Load Example
        </Button>
      )}

      {isFullscreen && (
        <>
          {canUndo && (
            <Button
              type="secondary"
              onClick={onUndo}
              aria-label={BUTTON_LABELS.UNDO}
              disabled={isYamlTabVisible}
            >
              <RevertSVG className="scale-x-[-1]" />
              {BUTTON_LABELS.UNDO}
            </Button>
          )}

          <Button
            type="secondary"
            onClick={onBeautify}
            aria-label="Beautify layout"
            disabled={isYamlTabVisible}
          >
            <WorkflowSVG />
            Beautify
          </Button>

          {onShowVisualVersionHistory ? (
            <Button
              type="secondary"
              onClick={onShowVisualVersionHistory}
              aria-label="Version History (visual editor)"
            >
              <HistorySVG />
              Version History
            </Button>
          ) : null}

          <Button
            type={isYamlTabVisible ? ButtonType.PRIMARY : ButtonType.SECONDARY}
            onClick={() => toggleTabs([TAB_DATA.YAML.ID, TAB_DATA.CONFIGURATION.ID])}
            aria-label={BUTTON_LABELS.YAML}
          >
            <CodeSVG />
            {BUTTON_LABELS.YAML}
          </Button>

          <div className="text-border-specific-node-border">|</div>

          <Button
            type={isConfigTabVisible ? ButtonType.PRIMARY : ButtonType.SECONDARY}
            onClick={() => toggleTabs([TAB_DATA.CONFIGURATION.ID])}
            aria-label={BUTTON_LABELS.WORKFLOW_CONFIG}
          >
            <SidebarSVG className={isConfigTabVisible ? 'rotate-180 transition' : 'transition'} />
            {BUTTON_LABELS.WORKFLOW_CONFIG}
          </Button>
        </>
      )}
    </div>
  )
}

export default EditorActions
