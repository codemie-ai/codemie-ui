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

import { ChangeEvent, forwardRef, useCallback, useImperativeHandle, useMemo, useState } from 'react'
import { Controller, UseFormReturn } from 'react-hook-form'

import AIFieldSvg from '@/assets/icons/ai-field.svg?react'
import Input from '@/components/form/Input'
import Switch from '@/components/form/Switch'
import Textarea from '@/components/form/Textarea'
import ProjectSelector from '@/components/ProjectSelector'
import TooltipButton from '@/components/TooltipButton'
import { MAX_DESCRIPTION_LENGTH } from '@/constants/skills'
import { AssistantFormContext } from '@/pages/assistants/components/AssistantForm/AssistantForm'
import FormSection from '@/pages/assistants/components/AssistantForm/components/FormSection'
import ToolsConfiguration from '@/pages/assistants/components/AssistantForm/components/Toolkits/ToolsConfiguration'
import { useRefineSkillRecommendations } from '@/pages/skills/hooks/useRefineSkillRecommendations'
import { SkillFormData } from '@/pages/skills/hooks/useSkillForm'
import { AssistantToolkit } from '@/types/entity/assistant'
import { MCPServerDetails } from '@/types/entity/mcp'
import {
  Skill,
  SkillAIFieldMarkers,
  SkillAIGeneratedFields,
  SkillAIRefineFields,
  SkillVisibility,
} from '@/types/entity/skill'

import RefineSkillModal from './RefineSkillModal'
import RefineWithAIPromptPopup from './RefineWithAIPromptPopup'
import SkillCategories from './SkillCategories'
import SkillInstructions from './SkillInstructions'

export interface SkillFormRef {
  submit: () => void
  addAIGeneratedFields: (values: SkillAIGeneratedFields) => void
  handleRefineWithAI: () => void
}

interface SkillFormProps {
  form: UseFormReturn<SkillFormData>
  onSubmit: (data: SkillFormData) => Promise<Skill>
  onSuccess?: () => void
  showNewIntegrationPopup: (project: string, credentialType: string) => void
  isCompactView?: boolean
}

const SkillForm = forwardRef<SkillFormRef, SkillFormProps>(
  ({ form, onSubmit, onSuccess, showNewIntegrationPopup, isCompactView = false }, ref) => {
    const { control, watch, setValue, handleSubmit, getValues } = form

    const descriptionValue = watch('description') ?? ''
    const visibility = watch('visibility')
    const toolkits = watch('toolkits') ?? []
    const mcpServers = watch('mcp_servers') ?? []
    const project = watch('project') ?? ''

    const [showRefinePromptPopup, setShowRefinePromptPopup] = useState(false)
    const [showRefineModal, setShowRefineModal] = useState(false)
    const [refineFields, setRefineFields] = useState<SkillAIRefineFields>({})
    const [aiGeneratedFieldMarkers, setAiGeneratedFieldMarkers] = useState<SkillAIFieldMarkers>({
      name: false,
      description: false,
      categories: false,
      instructions: false,
      toolkits: false,
    })

    const {
      applyFieldRecommendations,
      applyToolRecommendations,
      getRefineFieldValue,
      getRefineFieldRecommendation,
    } = useRefineSkillRecommendations({
      toolkits: toolkits as AssistantToolkit[],
      setValue,
      setAiGeneratedFieldMarkers,
    })

    // Derive shared state from visibility
    const isShared = visibility === SkillVisibility.PROJECT || visibility === SkillVisibility.PUBLIC

    const assistantFormContextValue = useMemo(
      () => ({ project, isChatConfig: isCompactView }),
      [project, isCompactView]
    )

    const handleToolkitsChange = useCallback(
      (updated: AssistantToolkit[]) => setValue('toolkits', updated, { shouldDirty: true }),
      [setValue]
    )

    const handleMcpServersChange = useCallback(
      (updated: MCPServerDetails[]) => setValue('mcp_servers', updated, { shouldDirty: true }),
      [setValue]
    )

    const handleSharedChange = (e: ChangeEvent<HTMLInputElement>) => {
      setValue('visibility', e.target.checked ? SkillVisibility.PROJECT : SkillVisibility.PRIVATE, {
        shouldValidate: true,
        shouldDirty: true,
      })
    }

    const handleFormSubmit = handleSubmit(
      async (data) => {
        try {
          await onSubmit(data)
          onSuccess?.()
        } catch (error) {
          console.error('Error submitting skill:', error)
        }
      },
      (errors) => {
        console.error('Form validation errors:', errors)
      }
    )

    const addAIGeneratedFields = (fields: SkillAIGeneratedFields) => {
      setValue('name', fields.name, { shouldValidate: true, shouldDirty: true })
      setValue('description', fields.description, { shouldValidate: true, shouldDirty: true })
      setValue('content', fields.instructions, { shouldValidate: true, shouldDirty: true })
      if (fields.categories?.length > 0) {
        setValue('categories', fields.categories, { shouldValidate: true, shouldDirty: true })
      }
      if (fields.toolkits?.length > 0) {
        setValue('toolkits', fields.toolkits as AssistantToolkit[], { shouldDirty: true })
      }
      setAiGeneratedFieldMarkers({
        name: true,
        description: true,
        instructions: true,
        categories: !!fields.categories?.length,
        toolkits: !!fields.toolkits?.length,
      })
    }

    const handleRefineWithAI = () => {
      setShowRefinePromptPopup(true)
    }

    const handleRefineWithPrompt = (refinePrompt: string) => {
      const values = getValues()
      const fields: SkillAIRefineFields = {
        name: values.name,
        description: values.description,
        instructions: values.content,
        categories: values.categories,
        toolkits: (toolkits as AssistantToolkit[]).map((tk) => ({
          toolkit: tk.toolkit,
          tools: tk.tools.map((t) => ({ name: t.name, label: t.label })),
        })),
      }
      if (refinePrompt.trim()) {
        fields.refine_prompt = refinePrompt.trim()
      }
      setRefineFields(fields)
      setShowRefinePromptPopup(false)
      setShowRefineModal(true)
    }

    useImperativeHandle(ref, () => ({
      submit: handleFormSubmit,
      addAIGeneratedFields,
      handleRefineWithAI,
    }))

    return (
      <>
        <form onSubmit={handleFormSubmit} className="relative flex flex-col gap-y-6 p-6 pb-10">
          <FormSection title="Skill Setup">
            <div className="flex gap-4 items-end">
              <Controller
                name="project"
                control={control}
                render={({ field }) => (
                  <ProjectSelector
                    label="Project name:"
                    className="grow"
                    value={field.value ?? ''}
                    onChange={(value) =>
                      setValue('project', Array.isArray(value) ? value[0] : value, {
                        shouldValidate: true,
                        shouldDirty: true,
                      })
                    }
                  />
                )}
              />
              <Switch
                label="Shared with project"
                className="mb-2"
                value={isShared}
                onChange={handleSharedChange}
              />
            </div>

            <div>
              <Controller
                name="name"
                control={control}
                render={({ field, fieldState }) => (
                  <Input
                    label="Name:"
                    placeholder="my-skill-name*"
                    rightIcon={aiGeneratedFieldMarkers.name && <AIFieldSvg />}
                    error={fieldState.error?.message}
                    {...field}
                  />
                )}
              />
              <p className="text-xs text-text-secondary mt-1">
                Must be kebab-case (lowercase letters, numbers, and hyphens only)
              </p>
            </div>

            <Controller
              name="description"
              control={control}
              render={({ field, fieldState }) => (
                <Textarea
                  label={`Description: (${descriptionValue.length}/${MAX_DESCRIPTION_LENGTH})`}
                  placeholder="Brief description of when to use this skill...*"
                  rows={3}
                  className={aiGeneratedFieldMarkers.description ? '!pr-9' : ''}
                  error={fieldState.error?.message}
                  maxLength={MAX_DESCRIPTION_LENGTH}
                  {...field}
                >
                  {aiGeneratedFieldMarkers.description && (
                    <div className="absolute top-10 right-4">
                      <AIFieldSvg />
                    </div>
                  )}
                </Textarea>
              )}
            />

            <Controller
              name="categories"
              control={control}
              render={({ field, fieldState }) => (
                <SkillCategories
                  value={field.value ?? []}
                  error={fieldState.error?.message}
                  isAIGenerated={aiGeneratedFieldMarkers.categories}
                  onChange={(value) => {
                    field.onChange(value)
                  }}
                />
              )}
            />
          </FormSection>

          <FormSection
            title="Instructions"
            description="Define the skill content that will be provided to assistants."
          >
            <Controller
              name="content"
              control={control}
              render={({ field, fieldState }) => (
                <SkillInstructions
                  value={field.value ?? ''}
                  error={fieldState.error?.message}
                  isAIGenerated={aiGeneratedFieldMarkers.instructions}
                  onChange={field.onChange}
                  onBlur={field.onBlur}
                />
              )}
            />
          </FormSection>

          <AssistantFormContext.Provider value={assistantFormContextValue}>
            <ToolsConfiguration
              toolkits={toolkits}
              mcpServers={mcpServers}
              onToolkitsChange={handleToolkitsChange}
              onMcpServersChange={handleMcpServersChange}
              showMcpServers={true}
              showNewIntegrationPopup={showNewIntegrationPopup}
              description="Select tools this skill needs to function. These tools are automatically applied to any assistant that uses this skill."
              availableToolsDescription="Select the tools your assistant may need. If Smart Tools selection is disabled, choose only relevant tools as selecting too many can negatively affect results, slow down responses, and increase costs. When Smart Tools selection is enabled, the assistant will automatically choose the most appropriate tools from your selection."
              renderHint={() => (
                <TooltipButton content="Some skills depend on specific tools to work correctly. For example, a business analysis skill that interacts with Jira must have the Jira tool selected here. Tools selected here are automatically enabled for any assistant using this skill, so the skill will work even if the assistant does not have those tools configured directly." />
              )}
            />
          </AssistantFormContext.Provider>
        </form>

        <RefineWithAIPromptPopup
          isVisible={showRefinePromptPopup}
          onHide={() => setShowRefinePromptPopup(false)}
          onRefine={handleRefineWithPrompt}
        />

        <RefineSkillModal
          visible={showRefineModal}
          refineFields={refineFields}
          onHide={() => setShowRefineModal(false)}
          onApplyFieldSuggestions={applyFieldRecommendations}
          onApplyToolSuggestions={applyToolRecommendations}
          getRefineFieldValue={getRefineFieldValue}
          getRefineFieldRecommendation={getRefineFieldRecommendation}
        />
      </>
    )
  }
)

SkillForm.displayName = 'SkillForm'

export default SkillForm
