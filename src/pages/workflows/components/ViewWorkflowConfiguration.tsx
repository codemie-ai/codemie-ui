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

import React, { useMemo } from 'react'
import { useSnapshot } from 'valtio'

import DetailsGradientLightSvg from '@/assets/images/details-gradient-light.svg?raw' // eslint-disable-line import/no-unresolved
import DetailsGradientSvg from '@/assets/images/details-gradient.svg?raw' // eslint-disable-line import/no-unresolved
import CodeBlock from '@/components/CodeBlock'
import InputCopy from '@/components/form/InputCopy'
import GuardrailAssignmentsDetails from '@/components/guardrails/GuardrailAssignmentsDetails/GuardrailAssignmentsDetails'
import ZoomableImage from '@/components/ZoomableImage'
import { useTheme } from '@/hooks/useTheme'
import { WORKFLOW_TAB } from '@/pages/workflows/constants'
import WorkflowNodeEditor from '@/pages/workflows/editor/WorkflowEditor'
import { getWorkflowLink } from '@/pages/workflows/utils/getWorkflowLink'
import { appInfoStore } from '@/store/appInfo'
import { ConfigItem } from '@/types/entity/configuration'
import { GuardrailEntity } from '@/types/entity/guardrail'
import api from '@/utils/api'
import { isVisualEditorEnabled } from '@/utils/workflows'

interface Workflow {
  id: number | string
  name: string
  description?: string
  project?: string
  schema_url?: string
  yaml_config?: string
  [key: string]: any
}

interface ViewWorkflowConfigurationProps {
  workflow: Workflow
}

const ViewWorkflowConfiguration: React.FC<ViewWorkflowConfigurationProps> = ({ workflow }) => {
  const { isDark } = useTheme()
  const workflowLink = useMemo(
    () => getWorkflowLink(String(workflow.id), WORKFLOW_TAB.CONFIG),
    [workflow.id]
  )
  const gradientSvg = isDark ? DetailsGradientSvg : DetailsGradientLightSvg

  const { configs } = useSnapshot(appInfoStore)
  const visualEditorEnabled = isVisualEditorEnabled(configs as ConfigItem[])

  return (
    <div className="flex mx-auto flex-row justify-between my-4 gap-9 min-w-0 max-view-details-bp:flex-col max-view-details-bp:mt-0">
      <div className="flex flex-col grow min-w-0 max-view-details-bp:order-2 text-sm">
        <div className="font-bold mb-2">About Workflow:</div>

        <div className="text-text-quaternary break-words whitespace-pre-wrap">
          {workflow?.description}
        </div>

        {visualEditorEnabled && workflow.yaml_config && (
          <div className="my-3 mt-8">
            <WorkflowNodeEditor
              workflow={workflow}
              yamlConfig={workflow.yaml_config}
              isFullscreen={false}
              onConfigurationUpdate={() => {}}
            />
          </div>
        )}

        {!visualEditorEnabled && workflow?.schema_url && (
          <div className="flex flex-col my-3 mt-8">
            <div className="text-sm font-bold mb-2">Workflow Graph Schema</div>

            <ZoomableImage>
              <img
                src={`${api.BASE_URL}/v1/files/${workflow.schema_url}`}
                className="w-full"
                alt="schema"
              />
            </ZoomableImage>
          </div>
        )}

        <div className="flex flex-col my-3">
          <div className="min-w-[400px]">
            <CodeBlock language="yaml" text={workflow?.yaml_config || ''} />
          </div>
        </div>
      </div>

      <div className="sticky max-view-details-bp:relative top-8 h-fit">
        <aside className="flex flex-col relative gap-6 p-4 text-xs bg-surface-base-secondary border border-border-structural rounded-lg min-w-[320px] max-w-[320px] max-view-details-bp:order-1 max-view-details-bp:relative max-view-details-bp:mb-6 max-view-details-bp:w-full">
          <div
            className="absolute top-[-60px] left-[-53px] z-[-1] max-view-details-bp:hidden"
            dangerouslySetInnerHTML={{ __html: gradientSvg }}
          />

          <div className="flex flex-col gap-2">
            <span className="uppercase font-semibold">OVERVIEW</span>

            <div>
              <span className="text-text-quaternary">Project: </span>
              {workflow.project}
            </div>

            <div className="mt-2 flex flex-col gap-2 uppercase">
              <div className="text-text-primary font-semibold">Workflow ID</div>
              <InputCopy
                text={String(workflow.id)}
                notification="Workflow ID copied to clipboard"
              />
            </div>
          </div>

          <div className="text-text-primary">
            <div>
              <div className="uppercase font-semibold">Access Links</div>

              <div className="font-normal mt-4 mb-2">Link to workflow details:</div>
              <InputCopy text={workflowLink} notification="Link to workflow copied to clipboard" />
            </div>
          </div>

          {workflow.project && (
            <GuardrailAssignmentsDetails
              project={workflow.project}
              entity={GuardrailEntity.WORKFLOW}
              entityId={String(workflow.id)}
              guardrailAssignments={workflow.guardrail_assignments || []}
            />
          )}
        </aside>
      </div>
    </div>
  )
}

export default ViewWorkflowConfiguration
