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

import CodeBlock from '@/components/CodeBlock'
import InputCopy from '@/components/form/InputCopy'
import { useTheme } from '@/hooks/useTheme'
import { preprocessYamlConfig, getRootPath } from '@/utils/utils'
import DetailsGradientSvg from '@/assets/images/details-gradient.svg?raw' // eslint-disable-line
import DetailsGradientLightSvg from '@/assets/images/details-gradient-light.svg?raw' // eslint-disable-line

interface WorkflowTemplate {
  slug: string
  name: string
  description?: string
  project?: string
  yaml_config?: string
  video_link?: string
  [key: string]: any
}

interface ViewWorkflowTemplateInfoProps {
  template: WorkflowTemplate
}

const ViewWorkflowTemplateInfo: React.FC<ViewWorkflowTemplateInfoProps> = ({ template }) => {
  const { isDark } = useTheme()

  const workflowTemplateLink = useMemo(
    () => `${getRootPath()}/#/workflows/templates/${encodeURIComponent(template.slug)}`,
    [template.slug]
  )

  const preparedYamlConfig = useMemo(() => {
    return template.yaml_config ? preprocessYamlConfig(template.yaml_config) : ''
  }, [template.yaml_config])

  const gradientSvg = isDark ? DetailsGradientSvg : DetailsGradientLightSvg

  return (
    <div className="flex flex-row my-3 mt-0 gap-9 max-view-details-bp:flex-col text-sm">
      <div className="flex flex-col min-w-0 max-view-details-bp:order-2">
        <div className="font-bold mb-2.5">About workflow:</div>

        <div className="text-text-quaternary break-words whitespace-pre-wrap">
          {template.description}
        </div>

        <div className="flex flex-col my-3">
          <div className="config">
            <CodeBlock language="yaml" text={preparedYamlConfig} />
          </div>
        </div>
      </div>

      <div className="sticky max-view-details-bp:relative max-view-details-bp:top-0 top-8 h-fit">
        <aside className="min-w-[320px] flex flex-col gap-2 bg-surface-base-secondary border-1 border-border-primary rounded-lg p-4 max-view-details-bp:order-1 max-view-details-bp:relative max-view-details-bp:mb-6 max-view-details-bp:w-full relative">
          <div
            className="absolute top-[-60px] left-[-53px] z-[-1] max-view-details-bp:hidden"
            dangerouslySetInnerHTML={{ __html: gradientSvg }}
          />

          <span className="text-text-base uppercase font-semibold">Overview</span>

          <div>
            <span className="text-text-quaternary">Project: </span>
            {template.project}
          </div>

          <div className="mt-5">
            <span className="uppercase font-semibold">
              <div className="text-text-quaternary mb-2">Link to workflow template</div>
              <InputCopy
                text={workflowTemplateLink}
                notification="Link to workflow template copied to clipboard"
              />
            </span>
          </div>

          {template.video_link && (
            <div className="mt-5">
              <span className="uppercase font-semibold">
                <div className="text-text-quaternary mb-2">Link to Video</div>
                <InputCopy
                  text={template.video_link}
                  notification="Link to video copied to clipboard"
                />
              </span>
            </div>
          )}
        </aside>
      </div>
    </div>
  )
}

export default ViewWorkflowTemplateInfo
