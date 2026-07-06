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
import Link from '@/components/Link'
import { INDEX_TYPES } from '@/constants/dataSources'
import { GOOGLE_OAUTH_CREDENTIAL_TYPE } from '@/constants/integration'
import { Setting } from '@/types/entity/setting'

import IntegrationSection from './shared/IntegrationSection'
import { useIntegrationManager } from './shared/useIntegrationManager'

interface Props {
  control: any
  errors: any
  googleDocsGuideEnabled: boolean
  googleDocsGuideConfig: any
  embeddingModels: any[]
  projectName: string
  hasNoSettings: (indexType: string) => boolean
  isDropdownShown: (indexType: string) => boolean
  filteredSettings: Record<string, Setting[]>
  onIntegrationCreated?: () => void
}

const IndexTypeGoogle: FC<Props> = ({
  errors,
  control,
  googleDocsGuideConfig,
  googleDocsGuideEnabled,
  embeddingModels,
  projectName,
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
    <div className="flex flex-col gap-6" data-onboarding="datasource-google-fields">
      <div className="-mb-4 -mt-2">
        <IntegrationSection
          hasNoSettings={hasNoSettings(INDEX_TYPES.GOOGLE)}
          isDropdownShown={isDropdownShown(INDEX_TYPES.GOOGLE)}
          datasourceType={INDEX_TYPES.GOOGLE}
          projectName={projectName}
          control={control}
          errors={errors}
          filteredSettings={filteredSettings}
          showIntegrationPopup={showIntegrationPopup}
          onOpenIntegrationPopup={openIntegrationPopup}
          onIntegrationSuccess={handleIntegrationSuccess}
          onIntegrationCancel={handleIntegrationCancel}
          integrationLabel="Google Auth Integration"
          integrationPlaceholder="Select Google Auth integration"
          credentialType={GOOGLE_OAUTH_CREDENTIAL_TYPE}
        />
      </div>

      <div className="flex flex-col gap-2">
        <Controller
          name="googleDoc"
          control={control}
          render={({ field }) => (
            <Input
              {...field}
              id="googleDoc"
              name="googleDoc"
              label="Google Docs Link"
              placeholder="https://docs.google.com/document/d/your-doc"
              error={errors.googleDoc?.message}
              className="w-full"
            />
          )}
        />

        <div className="flex flex-col gap-2">
          <InfoBox
            text={
              <>
                Google documents must follow a specific format for LLM routing:{' '}
                <Link
                  url="https://docs.google.com/document/d/19EXgnFCgJontz0ToCAH6zMGwBTdhi5X97P9JIby4wHs/edit?tab=t.0#heading=h.b01c2ig0adfg"
                  label="View Format Example"
                />
              </>
            }
          />

          {googleDocsGuideEnabled && (
            <InfoBox
              text={
                <>
                  For detailed instructions, refer to the{' '}
                  <Link url={googleDocsGuideConfig.url} label="Guide" />
                </>
              }
            />
          )}
        </div>
      </div>

      <FormAutocomplete
        name="embeddingsModel"
        control={control}
        id="embeddingsModel"
        label="Model used for embeddings"
        options={embeddingModels}
        placeholder="Embeddings Model Type"
        className="mt-0"
      />
    </div>
  )
}

export default IndexTypeGoogle
