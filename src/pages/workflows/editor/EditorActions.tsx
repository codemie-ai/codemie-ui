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
import WorkflowSVG from '@/assets/icons/workflow.svg?react'
import Button from '@/components/Button'
import { ButtonType } from '@/constants'
import { appInfoStore } from '@/store/appInfo'
import { isConfigItemEnabled, getConfigItemSettings } from '@/utils/settings'

interface EditorActionsProps {
  isFullscreen: boolean
  showWorkflowConfig: boolean
  showYamlPanel: boolean
  canUndo: boolean
  onUndo: () => void
  onLoadExample?: () => void
  onBeautify: () => void
  onShowYaml: () => void
  onToggleWorkflowConfig: () => void
}

const BUTTON_LABELS = {
  YAML: 'YAML',
  WORKFLOW_CONFIG: 'Workflow Config',
  UNDO: 'Undo',
}

const EditorActions = ({
  isFullscreen,
  showWorkflowConfig,
  showYamlPanel,
  canUndo,
  onUndo,
  onLoadExample,
  onBeautify,
  onShowYaml,
  onToggleWorkflowConfig,
}: EditorActionsProps) => {
  const { configs } = useSnapshot(appInfoStore)

  const isDocumentationEnabled = isConfigItemEnabled(configs, 'workflowDocumentation')
  const documentationUrl = getConfigItemSettings(configs, 'workflowDocumentation')?.url

  return (
    <div className="absolute top-4 right-4 z-10 flex gap-4">
      {isDocumentationEnabled && documentationUrl && (
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
              disabled={showYamlPanel}
            >
              <RevertSVG className="scale-x-[-1]" />
              {BUTTON_LABELS.UNDO}
            </Button>
          )}

          <Button
            type="secondary"
            onClick={onBeautify}
            aria-label="Beautify layout"
            disabled={showYamlPanel}
          >
            <WorkflowSVG />
            Beautify
          </Button>

          <Button
            type={showYamlPanel ? ButtonType.PRIMARY : ButtonType.SECONDARY}
            onClick={onShowYaml}
            aria-label={BUTTON_LABELS.YAML}
          >
            <CodeSVG />
            {BUTTON_LABELS.YAML}
          </Button>

          <div className="text-border-specific-node-border">|</div>

          <Button
            type={showWorkflowConfig ? ButtonType.PRIMARY : ButtonType.SECONDARY}
            onClick={onToggleWorkflowConfig}
            aria-label={BUTTON_LABELS.WORKFLOW_CONFIG}
          >
            <SidebarSVG className={showWorkflowConfig ? 'rotate-180 transition' : 'transition'} />
            {BUTTON_LABELS.WORKFLOW_CONFIG}
          </Button>
        </>
      )}
    </div>
  )
}

export default EditorActions
