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

import FilesFilterField from './shared/FilesFilterField'
import IntegrationSection from './shared/IntegrationSection'
import { useIntegrationManager } from './shared/useIntegrationManager'

interface Props {
  value
  control
  errors
  index
  projectName
  embeddingModels
  filteredSettings
  hasNoSettings: boolean
  isDropdownShown: boolean
  onIntegrationCreated?: () => void
}

const IndexTypeSvn: FC<Props> = ({
  value,
  control,
  errors,
  projectName,
  embeddingModels,
  filteredSettings,
  hasNoSettings,
  isDropdownShown,
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
        name="repoLink"
        control={control}
        render={({ field }) => (
          <Input
            {...field}
            id="repoLink"
            name="repoLink"
            className="w-full"
            label="Repository URL"
            error={errors.repoLink?.message}
            placeholder="https://svn.example.com/repos/myproject"
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
            rootClass="mt-4"
            className="w-full"
            label="Branch / Path"
            placeholder="trunk"
            error={errors.branch?.message}
          />
        )}
      />

      <div className="form-wrapper mt-4">
        <FilesFilterField control={control} errors={errors} />

        <div className="mt-3">
          <FormAutocomplete
            name="embeddingsModel"
            control={control}
            id="embeddingsModel"
            label="Model used for embeddings"
            options={embeddingModels}
            placeholder="Embeddings Model Type"
            className=""
          />
        </div>

        <IntegrationSection
          hasNoSettings={hasNoSettings}
          isDropdownShown={isDropdownShown}
          datasourceType={value}
          projectName={projectName}
          control={control}
          errors={errors}
          filteredSettings={filteredSettings}
          showIntegrationPopup={showIntegrationPopup}
          onOpenIntegrationPopup={openIntegrationPopup}
          onIntegrationSuccess={handleIntegrationSuccess}
          onIntegrationCancel={handleIntegrationCancel}
          integrationLabel="Integration for SVN"
          integrationPlaceholder="Integration for SVN"
        />
      </div>
    </div>
  )
}

export default IndexTypeSvn
