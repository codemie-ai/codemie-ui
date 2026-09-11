// Copyright 2026 EPAM Systems, Inc. ("EPAM")
//
// Licensed under the Apache License, Version 2.0 (the "License");
// you may not use this file except in compliance with the License.
// You may obtain a copy of the License at
//
//     http://www.apache.org/licenses/LICENSE-2.0
//
// Unless required by applicable law or agreed to in writing, software
// distributed under the License is distributed on an “AS IS” BASIS,
// WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
// See the License for the specific language governing permissions and
// limitations under the License.
//

import { FC } from 'react'
import { Controller } from 'react-hook-form'

import FormAutocomplete from '@/components/form/FormAutocomplete'
import InfoBox from '@/components/form/InfoBox'
import Input from '@/components/form/Input'
import { INDEX_TYPES } from '@/constants/dataSources'

import FilesFilterField from './shared/FilesFilterField'
import IntegrationSection from './shared/IntegrationSection'
import { useIntegrationManager } from './shared/useIntegrationManager'

interface Props {
  control
  errors
  projectName: string
  embeddingModels: any[]
  hasNoSettings: (indexType: string) => boolean
  isDropdownShown: (indexType: string) => boolean
  filteredSettings: Record<string, any>
  onIntegrationCreated?: () => void
}

const IndexTypeFaq: FC<Props> = ({
  control,
  errors,
  projectName,
  embeddingModels,
  hasNoSettings,
  isDropdownShown,
  filteredSettings,
  onIntegrationCreated,
}) => {
  const {
    showIntegrationPopup,
    handleIntegrationSuccess,
    handleIntegrationCancel,
    openIntegrationPopup,
  } = useIntegrationManager({ onIntegrationCreated })

  return (
    <div className="flex flex-col gap-6" data-onboarding="datasource-faq-fields">
      <div className="flex flex-col gap-4">
        <Controller
          name="repoLink"
          control={control}
          render={({ field }) => (
            <Input
              {...field}
              id="repoLink"
              name="repoLink"
              label="Repository Link"
              placeholder="https://git.example.com/team/docs"
              error={errors.repoLink?.message}
              className="w-full"
            />
          )}
        />

        <Controller
          name="branch"
          control={control}
          render={({ field }) => (
            <Input
              {...field}
              id="repoBranch"
              name="branch"
              label="Branch"
              placeholder="main"
              error={errors.branch?.message}
              className="w-full"
            />
          )}
        />
      </div>

      <InfoBox
        className="my-3"
        text="Ensure that you have provided credentials for private Git repositories in the 'User Integrations',
          otherwise, the process will fail. There is NO need to provide credentials in the Git link."
      />

      <FilesFilterField control={control} errors={errors} />

      <InfoBox
        text="Every .md file in the Git repository (any folder, any depth) is indexed as an
          article and split into header-based sections for search, narrowed only by the
          Files Filter above. Articles may use YAML frontmatter (title, instructions, reference)
          or plain markdown with a heading title."
      />

      <FormAutocomplete
        name="embeddingsModel"
        control={control}
        id="embeddingsModel"
        label="Model used for embeddings"
        options={embeddingModels}
        placeholder="Embeddings Model Type"
        className="mt-0"
      />

      <IntegrationSection
        // FAQ datasources authenticate with Git credentials — resolve the
        // integration list/credential type through the Git keys.
        hasNoSettings={hasNoSettings(INDEX_TYPES.GIT)}
        isDropdownShown={isDropdownShown(INDEX_TYPES.GIT)}
        datasourceType={INDEX_TYPES.GIT}
        projectName={projectName}
        control={control}
        errors={errors}
        filteredSettings={filteredSettings}
        showIntegrationPopup={showIntegrationPopup}
        onOpenIntegrationPopup={openIntegrationPopup}
        onIntegrationSuccess={handleIntegrationSuccess}
        onIntegrationCancel={handleIntegrationCancel}
        integrationLabel="Integration for Git"
        integrationPlaceholder="Integration for Git"
        isRequired={false}
      />
    </div>
  )
}

export default IndexTypeFaq
