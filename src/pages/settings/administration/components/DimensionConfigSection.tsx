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

import { FC, ReactNode } from 'react'

import ConfigItemList from './ConfigItemList'
import ConfigSection from './ConfigSection'
import ConfigSubSection from './ConfigSubSection'

interface DimensionData {
  component_weights?: Record<string, any>
  parameters?: Record<string, any>
  complexity_weights?: Record<string, any>
  scoring?: Record<string, any>
  [key: string]: any
}

interface DimensionConfigSectionProps {
  title: string
  icon: string
  dimensionData: DimensionData | undefined
  basePath: string[]
  isEditing?: boolean
  validationError?: string
  onSave: () => Promise<void>
  onCancel: () => void
  onUpdate: (path: string[], value: string) => void
  children?: (isEditing: boolean) => ReactNode
  hideEditButtons?: boolean
}

const DimensionConfigSection: FC<DimensionConfigSectionProps> = ({
  title,
  icon,
  dimensionData,
  basePath,
  validationError,
  onSave,
  onCancel,
  onUpdate,
  children,
  hideEditButtons = false,
}) => {
  // If children are provided, use them (for complex custom sections like D3/D4)
  if (children) {
    return (
      <ConfigSection
        title={title}
        icon={icon}
        onSave={onSave}
        onCancel={onCancel}
        error={validationError}
        hideEditButtons={hideEditButtons}
      >
        {children}
      </ConfigSection>
    )
  }

  // Default rendering for simple sections (D1/D2)
  return (
    <ConfigSection
      title={title}
      icon={icon}
      onSave={onSave}
      onCancel={onCancel}
      error={validationError}
      hideEditButtons={hideEditButtons}
    >
      {(isEditing) => (
        <>
          {dimensionData?.component_weights && (
            <div>
              <p className="text-sm font-medium text-text-primary mb-3">
                Component Weights (must sum to 1.0)
              </p>
              <div className="space-y-4">
                <ConfigItemList
                  items={dimensionData.component_weights}
                  isEditing={isEditing}
                  basePath={[...basePath, 'component_weights']}
                  onUpdate={onUpdate}
                />
              </div>
            </div>
          )}

          {dimensionData?.parameters && (
            <ConfigSubSection title="Parameters">
              <ConfigItemList
                items={dimensionData.parameters}
                isEditing={isEditing}
                basePath={[...basePath, 'parameters']}
                onUpdate={onUpdate}
              />
            </ConfigSubSection>
          )}
        </>
      )}
    </ConfigSection>
  )
}

export default DimensionConfigSection
