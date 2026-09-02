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
import { useSnapshot } from 'valtio'

import AceEditor from '@/components/AceEditor/AceEditor'
import { appInfoStore } from '@/store/appInfo'
import { isConfigItemEnabled, getConfigItemSettings } from '@/utils/settings'
import { cn } from '@/utils/utils'

import WorkflowYamlHeaderActions from './WorkflowYamlHeaderActions'

interface WorkflowConfigFieldProps {
  value: string
  onChange: (value: string) => void
  onlyConfiguration?: boolean
  onShowVersionHistory?: (visibleYaml: string) => void
}

const WorkflowConfigField: React.FC<WorkflowConfigFieldProps> = ({
  value,
  onChange,
  onlyConfiguration = false,
  onShowVersionHistory,
}) => {
  const { configs } = useSnapshot(appInfoStore)

  const isDocumentationEnabled = isConfigItemEnabled(configs, 'workflowYamlDocumentation')
  const documentationUrl = getConfigItemSettings(configs, 'workflowYamlDocumentation')?.url

  return (
    <div className="flex flex-col gap-2">
      <div className="flex items-center justify-between gap-3">
        {!onlyConfiguration && (
          <span className="shrink-0 whitespace-nowrap text-sm text-text-quaternary">
            YAML Configuration
          </span>
        )}
        <WorkflowYamlHeaderActions
          showDocumentation={isDocumentationEnabled}
          documentationUrl={documentationUrl}
          onShowVersionHistory={onShowVersionHistory}
          getVisibleYaml={() => value}
          versionHistoryAriaLabel="Version History (legacy editor)"
        />
      </div>
      <div className={cn(onlyConfiguration ? 'h-[500px]' : 'h-96')}>
        <AceEditor value={value} onChange={onChange} lang="yaml" name="yaml_config" />
      </div>
    </div>
  )
}

export default WorkflowConfigField
