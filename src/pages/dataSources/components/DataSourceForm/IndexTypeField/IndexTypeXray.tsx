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
import { Controller } from 'react-hook-form'

import FormAutocomplete from '@/components/form/FormAutocomplete'
import Input from '@/components/form/Input'

import IntegrationSection from './shared/IntegrationSection'
import { useIntegrationManager } from './shared/useIntegrationManager'

interface Props {
  errors
  hasNoSettings
  value
  projectName
  isDropdownShown
  control
  filteredSettings
  embeddingModels
  onIntegrationCreated?: () => void
}

const IndexTypeXray: FC<Props> = ({
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
    <div>
      <Controller
        name="jql"
        control={control}
        render={({ field }) => (
          <Input
            {...field}
            id="jql"
            name="jql"
            className="w-full"
            rootClass="mb-3"
            label="JQL Query:"
            placeholder='JQL expression, e.g.: project = "CALC" AND type = Test'
            error={errors.jql?.message}
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
        integrationLabel="Select integration for X-ray:"
        integrationPlaceholder="Integration for X-ray"
        credentialType="xray"
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

export default IndexTypeXray
