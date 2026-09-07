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

import { FC } from 'react'
import { Control, Controller, FieldErrors } from 'react-hook-form'

import FormAutocomplete from '@/components/form/FormAutocomplete'
import Input from '@/components/form/Input'

import { FormValues } from '../hooks/useEditPopupForm'
import IntegrationSection from './shared/IntegrationSection'
import { useIntegrationManager } from './shared/useIntegrationManager'

interface SettingOption {
  id: string
  project_name: string
  is_global: boolean
}

interface Props {
  errors: FieldErrors<FormValues>
  hasNoSettings: (indexType: string) => boolean
  value: string
  projectName: string
  isDropdownShown: (indexType: string) => boolean
  control: Control<FormValues>
  filteredSettings: Record<string, SettingOption[]>
  embeddingModels: { value: string; label: string }[]
  onIntegrationCreated?: () => void
}

const IndexTypeXWiki: FC<Props> = ({
  errors,
  hasNoSettings,
  value,
  projectName,
  isDropdownShown,
  control,
  filteredSettings,
  embeddingModels,
  onIntegrationCreated,
}) => {
  const {
    showIntegrationPopup,
    handleIntegrationSuccess,
    handleIntegrationCancel,
    openIntegrationPopup,
  } = useIntegrationManager({ onIntegrationCreated })

  return (
    <div data-onboarding="datasource-xwiki-fields">
      <Controller
        name="xwikiSpace"
        control={control}
        render={({ field }) => (
          <Input
            {...field}
            id="xwikiSpace"
            name="xwikiSpace"
            className="w-full"
            rootClass="mb-3"
            label="Space"
            placeholder='Space key to index, e.g.: "KB"'
            error={errors.xwikiSpace?.message}
          />
        )}
      />

      <Controller
        name="xwikiWiki"
        control={control}
        render={({ field }) => (
          <Input
            {...field}
            id="xwikiWiki"
            name="xwikiWiki"
            className="w-full"
            rootClass="mb-3"
            label="Wiki (optional)"
            placeholder='Wiki identifier, defaults to "xwiki"'
            error={errors.xwikiWiki?.message}
          />
        )}
      />

      <IntegrationSection
        hasNoSettings={hasNoSettings(value)}
        isDropdownShown={isDropdownShown(value)}
        datasourceType={value}
        projectName={projectName}
        control={control}
        errors={errors}
        filteredSettings={filteredSettings}
        showIntegrationPopup={showIntegrationPopup}
        onOpenIntegrationPopup={openIntegrationPopup}
        onIntegrationSuccess={handleIntegrationSuccess}
        onIntegrationCancel={handleIntegrationCancel}
        integrationLabel="Integration for xWiki"
        integrationPlaceholder="Integration for xWiki"
      />

      <FormAutocomplete
        name="embeddingsModel"
        control={control}
        id="embeddingsModel"
        label="Model used for embeddings"
        options={embeddingModels}
        placeholder="Embeddings Model Type"
      />
    </div>
  )
}

export default IndexTypeXWiki
