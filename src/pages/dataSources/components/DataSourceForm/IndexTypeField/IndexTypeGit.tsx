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

import Autocomplete from '@/components/form/Autocomplete'
import FormAutocomplete from '@/components/form/FormAutocomplete'
import InfoBox from '@/components/form/InfoBox'
import Input from '@/components/form/Input'
import Switch from '@/components/form/Switch'
import Textarea from '@/components/form/Textarea'
import TooltipButton from '@/components/TooltipButton'
import { REPO_INDEX_TYPE_OPTIONS, FILE_FILTER_PLACEHOLDER } from '@/constants/dataSources'

import IntegrationSection from './shared/IntegrationSection'
import { useIntegrationManager } from './shared/useIntegrationManager'

const FILES_FILTER_TOOLTIP = `- Patterns (e.g., *.py): Include ONLY matching files
- !Patterns (e.g., !*.nupkg): EXCLUDE matching files
- Combined (e.g., *.py + !test_*.py): Include .py files except test_*.py files`

interface Props {
  value
  control
  register
  errors
  index
  projectName
  embeddingModels
  llmModels
  filteredSettings
  isCodeSummarization
  isSummarizationPerFile
  hasNoSettings: boolean
  isDropdownShown: boolean
  onIntegrationCreated?: () => void
}

const IndexTypeGit: FC<Props> = ({
  value,
  control,
  register,
  errors,
  index,
  projectName,
  embeddingModels,
  llmModels,
  filteredSettings,
  isCodeSummarization,
  isSummarizationPerFile,
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
    <div data-onboarding="datasource-git-fields">
      {!index && (
        <Controller
          name="repoIndexType"
          control={control}
          render={({ field: repoField }) => (
            <Autocomplete
              id="repoIndexType"
              label="Summarization Method:"
              value={repoField.value!}
              onChange={repoField.onChange}
              options={REPO_INDEX_TYPE_OPTIONS}
              placeholder="Repository Index Type"
              name="repoIndexType"
            />
          )}
        />
      )}

      <Controller
        name="repoLink"
        control={control}
        render={({ field }) => (
          <Input
            {...field}
            id="repoLink"
            name="repoLink"
            rootClass="mt-4"
            className="w-full"
            label="Repository Link"
            error={errors.repoLink?.message}
            placeholder="https://gitlab.example.com/codemie"
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
            label="Branch"
            placeholder="main"
            error={errors.branch?.message}
          />
        )}
      />

      <InfoBox
        className="my-3"
        text="Ensure that you have provided credentials for private Git repositories in the 'User Integrations',
          otherwise, the process will fail. There is NO need to provide credentials in the Git link."
      ></InfoBox>

      <div className="form-wrapper">
        <Controller
          name="filesFilter"
          control={control}
          render={({ field }) => (
            <Textarea
              id="filesFilter"
              name="filesFilter"
              label="Files Filter"
              rows={4}
              value={field.value}
              onBlur={field.onBlur}
              error={errors.filesFilter?.message}
              placeholder={FILE_FILTER_PLACEHOLDER}
              onChange={(e) => field.onChange(e.target.value)}
            />
          )}
        />

        <div className="flex items-start text-text-secondary text-xs my-3">
          <TooltipButton
            content={FILES_FILTER_TOOLTIP}
            iconClassName="w-[18px] h-[18px]"
            wrapperClassName="mr-2 mt-0.5"
          />
          <span className="mt-0.5">
            Specify file extensions or names to include in indexing. Leaving empty will index all
            files.
          </span>
        </div>
        <div className="grid grid-cols-2 gap-3 mt-3">
          <div className="flex flex-col gap-2">
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

          {isCodeSummarization && (
            <div>
              <Controller
                name="summarizationModel"
                control={control}
                render={({ field: summaryField }) => (
                  <Autocomplete
                    id="summarizationModel"
                    value={summaryField.value!}
                    onChange={summaryField.onChange}
                    name="summarizationModel"
                    label="Model used for summary generation"
                    options={llmModels}
                    placeholder="Summarization Model Type"
                  />
                )}
              />
            </div>
          )}
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
          integrationLabel="Select integration for Git:"
          integrationPlaceholder="Integration for Git"
        />
      </div>

      <div className="mt-3 flex flex-col gap-3">
        {isSummarizationPerFile && (
          <Controller
            name="docsGeneration"
            control={control}
            render={({ field: docsField }) => (
              <Switch
                id="docsGeneration"
                value={docsField.value === 'true'}
                onChange={(e) => docsField.onChange(e.target.checked ? 'true' : 'false')}
                label="Push documentation to repository (when 'Summarization per file' is chosen)"
              />
            )}
          />
        )}

        {isCodeSummarization && (
          <Controller
            name="enableCustomPrompts"
            control={control}
            render={({ field: promptField }) => (
              <Switch
                id="promptCheckbox"
                value={!!promptField.value}
                onChange={promptField.onChange}
                label="Customize prompt for generated documentation"
              />
            )}
          />
        )}

        <Controller
          name="enableCustomPrompts"
          control={control}
          render={({ field: { value: enableField } }) =>
            enableField ? (
              <Textarea
                id="promptTemplate"
                name="promptTemplate"
                placeholder="Instructions"
                onBlur={register('promptTemplate').onBlur}
                onChange={register('promptTemplate').onChange}
                error={errors.promptTemplate?.message}
                rows={6}
              />
            ) : (
              <div />
            )
          }
        />
      </div>
    </div>
  )
}

export default IndexTypeGit
