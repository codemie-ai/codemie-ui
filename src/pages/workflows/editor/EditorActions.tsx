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

import { useSnapshot } from 'valtio'

import CodeSVG from '@/assets/icons/code.svg?react'
import ExternalSvg from '@/assets/icons/external.svg?react'
import RevertSVG from '@/assets/icons/revert.svg?react'
import SidebarSVG from '@/assets/icons/sidebar.svg?react'
import StatusFailedSvg from '@/assets/icons/status-failed.svg?react'
import WorkflowSVG from '@/assets/icons/workflow.svg?react'
import Button from '@/components/Button'
import { ButtonType } from '@/constants'
import { appInfoStore } from '@/store/appInfo'
import { isConfigItemEnabled, getConfigItemSettings } from '@/utils/settings'

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
  tabs: PanelTabId[]
  toggleTabs: (tabs: PanelTabId[]) => void
}

const BUTTON_LABELS = {
  YAML: 'YAML',
  WORKFLOW_CONFIG: 'Workflow Config',
  UNDO: 'Undo',
  ISSUES: 'Issues',
}

const EditorActions = ({
  withDocs,
  isFullscreen,
  canUndo,
  onUndo,
  onLoadExample,
  onBeautify,
  tabs,
  toggleTabs,
}: EditorActionsProps) => {
  const { issues } = useWorkflowContext()
  const { configs } = useSnapshot(appInfoStore)
  const isYamlTabVisible = tabs.includes(TAB_DATA.YAML.ID)
  const isConfigTabVisible = tabs[0] === TAB_DATA.CONFIGURATION.ID

  const isDocumentationEnabled = isConfigItemEnabled(configs, 'workflowDocumentation')
  const documentationUrl = getConfigItemSettings(configs, 'workflowDocumentation')?.url

  return (
    <div className="absolute top-4 right-4 z-10 flex gap-4">
      {issues !== null && (
        <Button
          variant="delete"
          onClick={() => toggleTabs([TAB_DATA.ISSUES.ID])}
          aria-label={BUTTON_LABELS.ISSUES}
          type={tabs.includes(TAB_DATA.ISSUES.ID) ? ButtonType.PRIMARY : ButtonType.SECONDARY}
        >
          <StatusFailedSvg />
          {BUTTON_LABELS.ISSUES}
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
