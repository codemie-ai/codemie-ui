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
import InfoBox from '@/components/form/InfoBox'
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

const IndexTypeAzureDevOpsWiki: FC<Props> = ({
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
        name="wikiName"
        control={control}
        render={({ field }) => (
          <Input
            {...field}
            id="wikiName"
            name="wikiName"
            className="w-full"
            rootClass="mb-3"
            label="Wiki Name (optional):"
            placeholder='e.g.: "MyProject.wiki" (leave empty for all wikis)'
            error={errors.wikiName?.message}
          />
        )}
      />

      <Controller
        name="wikiQuery"
        control={control}
        render={({ field }) => (
          <Input
            {...field}
            id="wikiQuery"
            name="wikiQuery"
            className="w-full"
            rootClass="mb-3"
            label="Page Path Query (optional):"
            placeholder='e.g.: "*" for all pages, "/path/*" for specific folder'
            error={errors.wikiQuery?.message}
          />
        )}
      />

      <InfoBox
        className="mb-3"
        text='The page path should not include "/Overview/Wiki" and must start from the page level. For example, if your Azure DevOps breadcrumbs show "ProjectName/WikiName/Overview/Wiki/Page1/Page2", use "/Page1/*" as the path. Build the path using breadcrumb values, not the page URL.'
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
        integrationLabel="Select integration for Azure DevOps Wiki:"
        integrationPlaceholder="Integration for Azure DevOps Wiki"
        credentialType="azuredevops"
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

export default IndexTypeAzureDevOpsWiki
