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

import { Control, FieldErrors, UseFormSetValue, Controller } from 'react-hook-form'

import AIFieldSvg from '@/assets/icons/ai-field.svg?react'
import Accordion from '@/components/Accordion'
import InfoBox from '@/components/form/InfoBox'
import Input from '@/components/form/Input'
import Switch from '@/components/form/Switch'
import ProjectSelector from '@/components/ProjectSelector'
import { AssistantAIFieldMarkers, AssistantPromptVariable } from '@/types/entity/assistant'
import { cn } from '@/utils/utils'

import CategoriesField from './CategoriesField'
import ConversationStartersField from './ConversationStartersField'
import DescriptionField from './DescriptionField'
import LogoUploadPanel from './LogoUploadPanel'
import SlugField from './SlugField'
import { AssistantFormSchema } from '../../AssistantForm'
import LLMSelector from '../LLMSelector'
import SystemPrompt from '../SystemPrompt/SystemPrompt'

interface AssistantSetupSectionProps {
  control: Control<AssistantFormSchema>
  errors: FieldErrors<AssistantFormSchema>
  setValue: UseFormSetValue<AssistantFormSchema>
  hasUserSettings: boolean
  aiGeneratedFieldMarkers: AssistantAIFieldMarkers
  setAiGeneratedFieldMarkers: (
    markers: AssistantAIFieldMarkers | ((prev: AssistantAIFieldMarkers) => AssistantAIFieldMarkers)
  ) => void
  promptVariables: AssistantPromptVariable[]
  onNameChange: (newName: string, oldName: string) => void
  isCompactView?: boolean
}

const AssistantSetupSection = ({
  control,
  errors,
  setValue,
  hasUserSettings,
  aiGeneratedFieldMarkers,
  setAiGeneratedFieldMarkers,
  promptVariables,
  onNameChange,
  isCompactView = false,
}: AssistantSetupSectionProps) => (
  <Accordion
    title="Assistant Setup"
    description="Define the assistant's name, project, and visibility."
    defaultOpen={true}
    className={cn(isCompactView && 'max-w-sm mt-5')}
  >
    <div className="px-4 pb-4 flex flex-col gap-6">
      <div className={isCompactView ? 'flex flex-col gap-4' : 'flex items-start gap-8'}>
        <Controller
          name="icon_url"
          control={control}
          render={({ field, fieldState }) => (
            <LogoUploadPanel
              value={field.value ?? ''}
              onChange={field.onChange}
              onBlur={field.onBlur}
              error={fieldState.error?.message}
              className={isCompactView ? 'w-full' : 'flex-1'}
              isCompactView={isCompactView}
              name={field.name}
            />
          )}
        />

        {!isCompactView && <div className="w-px bg-border-secondary self-stretch" />}

        <div className={cn('flex flex-col gap-7 pt-3', isCompactView ? 'w-full' : 'flex-1 mr-6')}>
          <div className="flex flex-col gap-3.5 w-full">
            <Controller
              name="project"
              control={control}
              render={({ field }) => (
                <ProjectSelector
                  label="Select project:"
                  className="w-full"
                  value={field.value ?? ''}
                  onChange={(value) =>
                    setValue('project', Array.isArray(value) ? value[0] : value, {
                      shouldDirty: false,
                    })
                  }
                />
              )}
            />

            <div className="flex items-center">
              <Controller
                name="shared"
                control={control}
                render={({ field }) => (
                  <Switch
                    label="Shared with project"
                    labelClassName="font-mono text-sm leading-6"
                    value={field.value}
                    onChange={(e) => field.onChange(e.target.checked)}
                    disabled={hasUserSettings}
                  />
                )}
              />
            </div>

            {hasUserSettings && (
              <InfoBox>
                Important note: You can&apos;t share an assistant that has personal integrations on
                one of it&apos;s tools.
              </InfoBox>
            )}
          </div>

          <Controller
            name="name"
            control={control}
            render={({ field, fieldState }) => (
              <Input
                label="Name:"
                placeholder="Name*"
                name={field.name}
                className="w-full"
                inputClass="font-mono text-sm leading-6 font-medium"
                rightIcon={aiGeneratedFieldMarkers.name && <AIFieldSvg />}
                error={fieldState.error?.message}
                value={field.value}
                onChange={(e) => {
                  onNameChange(e.target.value, field.value)
                  field.onChange(e)
                }}
              />
            )}
          />
        </div>
      </div>

      <Controller
        name="description"
        control={control}
        render={({ field, fieldState }) => (
          <DescriptionField
            value={field.value}
            onChange={field.onChange}
            onBlur={field.onBlur}
            error={fieldState.error?.message}
            isAIGenerated={aiGeneratedFieldMarkers.description}
            name={field.name}
          />
        )}
      />

      <Controller
        name="conversation_starters"
        control={control}
        render={({ field }) => (
          <ConversationStartersField
            value={field.value}
            onChange={field.onChange}
            error={errors.conversation_starters?.[0]?.message}
            isAIGenerated={aiGeneratedFieldMarkers.conversation_starters}
            onMarkAsManual={() =>
              setAiGeneratedFieldMarkers((prev) => ({
                ...prev,
                conversation_starters: false,
              }))
            }
            name={field.name}
          />
        )}
      />

      <Controller
        name="categories"
        control={control}
        render={({ field }) => (
          <CategoriesField
            value={field.value ?? []}
            onChange={field.onChange}
            isAIGenerated={aiGeneratedFieldMarkers.categories}
          />
        )}
      />

      <Controller
        name="system_prompt"
        control={control}
        render={({ field, fieldState }) => (
          <SystemPrompt
            isAIGenerated={aiGeneratedFieldMarkers.system_prompt}
            setIsAiGenerated={(value) =>
              setAiGeneratedFieldMarkers((pr) => ({ ...pr, system_prompt: value }))
            }
            promptVariables={promptVariables}
            onUpdatePromptVariables={(values: AssistantPromptVariable[]) => {
              setValue('prompt_variables', values, { shouldValidate: false })
            }}
            error={fieldState.error?.message}
            {...field}
          />
        )}
      />

      <Accordion
        title="Extra configuration"
        defaultOpen={false}
        className={cn(isCompactView && 'max-w-sm')}
      >
        <div className={cn('px-4 pb-4 flex gap-6', isCompactView ? 'flex-col' : 'flex-row gap-16')}>
          {/* Column 1 */}
          <div className={cn('flex flex-col gap-6', !isCompactView && 'w-72')}>
            <Controller
              name="llm_model_type"
              control={control}
              render={({ field }) => (
                <LLMSelector
                  label="LLM model:"
                  placeholder="LLM model"
                  className="w-full"
                  value={field.value ?? ''}
                  onChange={(value) => setValue('llm_model_type', value, { shouldDirty: false })}
                />
              )}
            />
            {/* TODO: Uncomment when Tools Tokens Size Limit is implemented on the backend */}
            {/* <Controller
              name="tools_tokens_size_limit"
              control={control}
              render={({ field, fieldState }) => (
                <Input
                  label="Tools Tokens Size Limit:"
                  placeholder="Enter limit"
                  className="w-full"
                  error={fieldState.error?.message}
                  {...field}
                />
              )}
            /> */}
          </div>

          {/* Column 2 */}
          <div className={cn('flex flex-col gap-6', !isCompactView && 'flex-1')}>
            <div className="flex gap-8">
              <Controller
                name="temperature"
                control={control}
                render={({ field, fieldState }) => (
                  <Input
                    label="Temperature:"
                    placeholder="0-2"
                    rootClass="w-24"
                    error={fieldState.error?.message}
                    {...field}
                  />
                )}
              />
              <Controller
                name="top_p"
                control={control}
                render={({ field, fieldState }) => (
                  <Input
                    label="Top P:"
                    placeholder="0-1"
                    rootClass="w-24"
                    error={fieldState.error?.message}
                    {...field}
                  />
                )}
              />
            </div>
            <div className="max-w-80">
              <Controller
                name="slug"
                control={control}
                render={({ field, fieldState }) => (
                  <SlugField
                    value={field.value ?? ''}
                    onChange={field.onChange}
                    onBlur={field.onBlur}
                    error={fieldState.error?.message}
                    name={field.name}
                  />
                )}
              />
            </div>
          </div>
        </div>
      </Accordion>
    </div>
  </Accordion>
)

export default AssistantSetupSection
