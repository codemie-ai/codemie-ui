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

import { ChangeEvent, forwardRef, useCallback, useImperativeHandle, useMemo } from 'react'
import { Controller, UseFormReturn } from 'react-hook-form'

import Input from '@/components/form/Input'
import Switch from '@/components/form/Switch'
import Textarea from '@/components/form/Textarea'
import ProjectSelector from '@/components/ProjectSelector'
import TooltipButton from '@/components/TooltipButton'
import { MAX_DESCRIPTION_LENGTH } from '@/constants/skills'
import { AssistantFormContext } from '@/pages/assistants/components/AssistantForm/AssistantForm'
import FormSection from '@/pages/assistants/components/AssistantForm/components/FormSection'
import ToolsConfiguration from '@/pages/assistants/components/AssistantForm/components/Toolkits/ToolsConfiguration'
import { SkillFormData } from '@/pages/skills/hooks/useSkillForm'
import { AssistantToolkit } from '@/types/entity/assistant'
import { MCPServerDetails } from '@/types/entity/mcp'
import { Skill, SkillVisibility } from '@/types/entity/skill'

import SkillCategories from './SkillCategories'
import SkillInstructions from './SkillInstructions'

export interface SkillFormRef {
  submit: () => void
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
    const { control, watch, setValue, handleSubmit } = form

    const descriptionValue = watch('description') ?? ''
    const visibility = watch('visibility')
    const toolkits = watch('toolkits') ?? []
    const mcpServers = watch('mcp_servers') ?? []
    const project = watch('project') ?? ''

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

    useImperativeHandle(ref, () => ({
      submit: handleFormSubmit,
    }))

    return (
      <form onSubmit={handleFormSubmit} className="relative flex flex-col gap-y-6 p-6 pb-2">
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
                error={fieldState.error?.message}
                maxLength={MAX_DESCRIPTION_LENGTH}
                {...field}
              />
            )}
          />

          <Controller
            name="categories"
            control={control}
            render={({ field, fieldState }) => (
              <SkillCategories
                value={field.value ?? []}
                error={fieldState.error?.message}
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
                onChange={field.onChange}
                onBlur={field.onBlur}
              />
            )}
          />
        </FormSection>

        <AssistantFormContext.Provider value={assistantFormContextValue}>
          {/* TODO: Re-enable MCP servers section once the backend supports saving mcp_servers for skills */}
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
    )
  }
)

SkillForm.displayName = 'SkillForm'

export default SkillForm
