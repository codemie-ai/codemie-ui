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

import { yupResolver } from '@hookform/resolvers/yup'
import isEmpty from 'lodash/isEmpty'
import isNumber from 'lodash/isNumber'
import isString from 'lodash/isString'
import { forwardRef, useEffect, useImperativeHandle, useState } from 'react'
import { useForm, Controller } from 'react-hook-form'
import { useSnapshot } from 'valtio'
import * as Yup from 'yup'

import AIFieldSvg from '@/assets/icons/ai-field.svg?react'
import Button from '@/components/Button'
import ExpandableTextarea from '@/components/form/ExpandableTextarea/ExpandableTextarea'
import Input from '@/components/form/Input'
import ContextSelector from '@/pages/assistants/components/AssistantForm/components/ContextSelector'
import LLMSelector from '@/pages/assistants/components/AssistantForm/components/LLMSelector'
import SystemPromptGenAIPopup from '@/pages/assistants/components/AssistantForm/components/SystemPrompt/SystemPromptGenAIPopup'
import Toolkits from '@/pages/assistants/components/AssistantForm/components/Toolkits/Toolkits'
import { assistantsStore } from '@/store'
import { settingsStore } from '@/store/settings'
import {
  AssistantContext,
  AssistantToolkit,
  AssistantAIGeneratedFields,
} from '@/types/entity/assistant'
import { MCPServerDetails } from '@/types/entity/mcp'
import { AssistantConfiguration } from '@/types/workflowEditor/configuration'
import { getMCPServersFromConfiguration, getToolkitsFromConfiguration } from '@/utils/workflows'

export interface VirtualAssistantFormValues {
  system_prompt: string
  llm_model_type?: string
  temperature?: number
  top_p?: number
  toolkits: AssistantToolkit[]
  mcp_servers: MCPServerDetails[]
  context: Array<AssistantContext>
}

interface VirtualAssistantFormProps {
  project: string
  assistantConfig?: AssistantConfiguration
  showNewIntegrationPopup: (project: string, credentialType: string) => void
  onContentChange?: (isEmpty: boolean) => void
}

export interface VirtualAssistantFormRef {
  getValues: () => VirtualAssistantFormValues
  validate: () => Promise<boolean>
  setAIGeneratedFields: (fields: AssistantAIGeneratedFields) => void
  isDirty: () => boolean
  reset: () => void
}

const validationSchema = Yup.object().shape({
  system_prompt: Yup.string().required('System instructions are required'),
  llm_model_type: Yup.string().optional(),
  temperature: Yup.number()
    .min(0, 'Temperature must be at least 0')
    .max(2, 'Temperature must be at most 2')
    .transform((value, originalValue) => (originalValue === '' ? undefined : value))
    .typeError('Temperature must be a number')
    .optional(),
  top_p: Yup.number()
    .min(0, 'Top P must be at least 0')
    .max(1, 'Top P must be at most 1')
    .transform((value, originalValue) => (originalValue === '' ? undefined : value))
    .typeError('Top P must be a number')
    .optional(),
  toolkits: Yup.array().of(Yup.object()).default([]),
  mcp_servers: Yup.array().of(Yup.object()).default([]),
  context: Yup.array()
    .of(
      Yup.object().shape({
        id: Yup.string().required(),
        name: Yup.string().required(),
        context_type: Yup.string().required(),
      })
    )
    .default([]),
})

const getDefaultValues = (config?: AssistantConfiguration): VirtualAssistantFormValues => ({
  system_prompt: config?.system_prompt || '',
  llm_model_type: config?.model || '',
  temperature: config?.temperature,
  top_p: undefined,
  toolkits: [],
  mcp_servers: [],
  context: [],
})

const VirtualAssistantForm = forwardRef<VirtualAssistantFormRef, VirtualAssistantFormProps>(
  ({ assistantConfig, showNewIntegrationPopup, project, onContentChange }, ref) => {
    const { availableContext, availableToolkits } = useSnapshot(assistantsStore)
    const { settings } = useSnapshot(settingsStore)
    const {
      control,
      getValues,
      trigger,
      setValue,
      watch,
      formState: { isDirty },
      reset,
    } = useForm<VirtualAssistantFormValues>({
      resolver: yupResolver(validationSchema as any),
      mode: 'onChange',
      defaultValues: getDefaultValues(assistantConfig),
    })

    const [showRefinePromptPopup, setShowRefinePromptPopup] = useState(false)
    const [isSystemPromptAIGenerated, setIsSystemPromptAIGenerated] = useState(false)
    const toolkits = watch('toolkits')
    const mcpServers = watch('mcp_servers')
    const systemPrompt = watch('system_prompt')

    const handleAIGenerated = (fields: AssistantAIGeneratedFields) => {
      setIsSystemPromptAIGenerated(true)
      setValue('system_prompt', fields.system_prompt, { shouldValidate: true })

      if (fields.toolkits?.length > 0) {
        setValue('toolkits', fields.toolkits as AssistantToolkit[], { shouldValidate: true })
      }
    }

    useImperativeHandle(
      ref,
      () => ({
        getValues: () => {
          const values = getValues()
          if (
            (isString(values.temperature) && !isEmpty(values.temperature)) ||
            isNumber(values.temperature)
          )
            values.temperature = Number(values.temperature)
          else delete values.temperature

          return values
        },
        validate: async () => {
          return trigger()
        },
        setAIGeneratedFields: (fields: AssistantAIGeneratedFields) => {
          handleAIGenerated(fields)
        },
        isDirty: () => isDirty,
        reset: () => reset(getValues()),
      }),
      [getValues, trigger, isDirty, setValue, setIsSystemPromptAIGenerated, reset]
    )

    const handleToolkitsChange = (newToolkits: AssistantToolkit[]) => {
      setValue('toolkits', newToolkits, { shouldValidate: true })
    }

    const handleMcpServersChange = (newMcpServers: MCPServerDetails[]) => {
      setValue('mcp_servers', newMcpServers, { shouldValidate: true })
    }

    const handlePromptRefined = (refinedPrompt: string) => {
      setValue('system_prompt', refinedPrompt, { shouldValidate: true })
      setIsSystemPromptAIGenerated(true)
    }

    useEffect(() => {
      if (!availableContext?.length || !assistantConfig?.datasource_ids?.length) return

      const selectedContext = availableContext.filter((context) =>
        assistantConfig.datasource_ids?.includes(context.id)
      )

      setValue('context', selectedContext, { shouldValidate: true, shouldDirty: false })
    }, [availableContext, assistantConfig?.datasource_ids, setValue])

    useEffect(() => {
      if (!availableToolkits?.length || isEmpty(settings)) return

      if (assistantConfig?.tools?.length) {
        setValue(
          'toolkits',
          getToolkitsFromConfiguration(
            assistantConfig.tools,
            availableToolkits as AssistantToolkit[],
            settings as any
          ),
          { shouldValidate: true, shouldDirty: false }
        )
      }

      if (assistantConfig?.mcp_servers?.length) {
        setValue(
          'mcp_servers',
          getMCPServersFromConfiguration(assistantConfig.mcp_servers, settings as any),
          { shouldValidate: true, shouldDirty: false }
        )
      }
    }, [availableToolkits?.length, assistantConfig?.tools, settings])

    useEffect(() => {
      const isEmpty = !systemPrompt && (!toolkits || toolkits.length === 0)
      onContentChange?.(isEmpty)
    }, [systemPrompt, toolkits, onContentChange])

    useEffect(() => {
      reset(getValues()) // reset so form is not dirty
    }, [])

    return (
      <>
        <div className="flex flex-col gap-4">
          <div className="flex flex-col gap-2">
            {systemPrompt && (
              <div className="flex justify-start">
                <Button
                  variant="magical"
                  size="small"
                  onClick={() => setShowRefinePromptPopup(true)}
                >
                  Refine with AI
                </Button>
              </div>
            )}

            <Controller
              name="system_prompt"
              control={control}
              render={({ field, fieldState }) => (
                <div className="relative">
                  <ExpandableTextarea
                    label="System Instructions:"
                    placeholder="Enter system instructions for the assistant"
                    rows={8}
                    error={fieldState.error?.message}
                    {...field}
                    onChange={(e) => {
                      setIsSystemPromptAIGenerated(false)
                      field.onChange(e)
                    }}
                  />
                  {isSystemPromptAIGenerated && (
                    <div className="absolute top-10 right-4">
                      <AIFieldSvg />
                    </div>
                  )}
                </div>
              )}
            />
          </div>

          <div className="flex gap-x-4 gap-y-4 flex-wrap">
            <Controller
              name="llm_model_type"
              control={control}
              render={({ field }) => (
                <LLMSelector
                  label="LLM model:"
                  placeholder="Select model"
                  className="grow max-w-sm"
                  {...field}
                />
              )}
            />

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
          </div>

          <Controller
            name="context"
            control={control}
            render={({ field }) => <ContextSelector {...field} project={project} withID />}
          />

          <Toolkits
            toolkits={toolkits || []}
            mcpServers={mcpServers || []}
            onToolkitsChange={handleToolkitsChange}
            onMcpServersChange={handleMcpServersChange}
            showNewIntegrationPopup={showNewIntegrationPopup}
            project={project}
          />
        </div>

        <SystemPromptGenAIPopup
          isVisible={showRefinePromptPopup}
          existingPrompt={systemPrompt}
          onHide={() => setShowRefinePromptPopup(false)}
          onSuggestedPrompt={handlePromptRefined}
        />
      </>
    )
  }
)

export default VirtualAssistantForm
