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

import React, { useState } from 'react'
import { useSnapshot } from 'valtio'

import ExternalSvg from '@/assets/icons/external.svg?react'
import AceEditor from '@/components/AceEditor/AceEditor'
import Button from '@/components/Button'
import VersionedField, {
  VERSIONED_FIELD_TAB_ID,
  VersionedFieldTabId,
} from '@/components/form/VersionedField/VersionedField'
import { VersionedFieldOption } from '@/components/form/VersionedField/VersionedFieldHistoryTab'
import { ButtonType } from '@/constants'
import { appInfoStore } from '@/store/appInfo'
import { createdBy, formatDate, SHORT_DATE_FORMAT } from '@/utils/helpers'
import { isConfigItemEnabled, getConfigItemSettings } from '@/utils/settings'
import { cn } from '@/utils/utils'

interface WorkflowConfigFieldProps {
  value: string
  onChange: (value: string) => void
  workflow: any
  isEditing?: boolean
  onlyConfiguration?: boolean
  history?: any[]
  onRestore?: (workflow: any) => void
}

const WorkflowConfigField: React.FC<WorkflowConfigFieldProps> = ({
  value,
  onChange,
  workflow,
  isEditing = false,
  onlyConfiguration = false,
  history = [],
  onRestore,
}) => {
  const { configs } = useSnapshot(appInfoStore)
  const [activeTab, setActiveTab] = useState<VersionedFieldTabId>(VERSIONED_FIELD_TAB_ID.current)
  const [selectedHistoryOption, setSelectedHistoryOption] = useState<string | null>(null)

  const isDocumentationEnabled = isConfigItemEnabled(configs, 'workflowYamlDocumentation')
  const documentationUrl = getConfigItemSettings(configs, 'workflowYamlDocumentation')?.url

  const historyOptions: VersionedFieldOption[] = history.map((item) => {
    let label = formatDate(item.date, SHORT_DATE_FORMAT)
    label += ` - ${createdBy(item.created_by)}`
    return { label, value: item.yaml_config }
  })

  const handleRestore = () => {
    if (selectedHistoryOption && onRestore) {
      onRestore({ ...workflow, yaml_config: selectedHistoryOption })
    }
  }

  const headerContent =
    isDocumentationEnabled && documentationUrl ? (
      <a
        href={documentationUrl}
        target="_blank"
        rel="noopener noreferrer"
        className="hover:no-underline"
      >
        <Button variant={ButtonType.SECONDARY} size="medium" className="!text-sm !font-bold">
          <ExternalSvg />
          Documentation
        </Button>
      </a>
    ) : null

  const currentTab = (
    <div className="flex flex-col gap-2">
      <div className={cn(onlyConfiguration ? 'h-[500px]' : 'h-96')}>
        <AceEditor value={value} onChange={onChange} lang="yaml" name="yaml_config" />
      </div>
    </div>
  )

  const historyTab = selectedHistoryOption ? (
    <div className={cn(onlyConfiguration ? 'h-[500px]' : 'h-96')}>
      <AceEditor
        value={selectedHistoryOption}
        onChange={() => {}}
        lang="yaml"
        readonly
        name="yaml_config_history"
      />
    </div>
  ) : null

  return (
    <VersionedField
      activeTab={activeTab}
      onTabChange={setActiveTab}
      historyOptions={historyOptions}
      selectedHistoryOption={selectedHistoryOption}
      onHistoryOptionChange={setSelectedHistoryOption}
      headerContent={headerContent}
      currentTab={currentTab}
      historyTab={historyTab}
      label={onlyConfiguration ? '' : 'YAML Configuration'}
      isLoading={false}
      isEditing={isEditing}
      onRestore={handleRestore}
    />
  )
}

export default WorkflowConfigField
