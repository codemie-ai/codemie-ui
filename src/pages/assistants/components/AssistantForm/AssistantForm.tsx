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
import uniq from 'lodash/uniq'
import {
  createContext,
  forwardRef,
  useCallback,
  useEffect,
  useImperativeHandle,
  useMemo,
  useState,
} from 'react'
import { Controller, useForm } from 'react-hook-form'
import * as Yup from 'yup'

import Accordion from '@/components/Accordion'
import Button from '@/components/Button'
import GuardrailAssignmentPanel from '@/components/guardrails/GuardrailAssignmentPanel/GuardrailAssignmentPanel'
import { guardrailAssignmentsSchema } from '@/components/guardrails/GuardrailAssignmentPanel/schemas/guardrailAssignmentSchema'
import SkillSelector from '@/components/SkillSelector'
import { SYSTEM_PROMPT_VARIABLES } from '@/constants'
import { ASSISTANT_INDEX_SCOPES } from '@/constants/assistants'
import { FormIDs } from '@/constants/formIds'
import { MAX_SKILLS_PER_ASSISTANT } from '@/constants/skills'
import { useFeatureFlag } from '@/hooks/useFeatureFlags'
import { useUnsavedChanges } from '@/hooks/useUnsavedChangesWarning'
import MissingIntegrationsModal from '@/pages/assistants/components/MissingIntegrationsModal'
import {
  useMissingIntegrationsModal,
  SubmitResponse,
} from '@/pages/assistants/hooks/useMissingIntegrationsModal'
import { userStore } from '@/store'
import {
  Assistant,
  AssistantAIGeneratedFields,
  AssistantAIRefineFields,
  AssistantAIFieldMarkers,
  AssistantCategory,
  AssistantToolkit,
  AssistantContext,
} from '@/types/entity/assistant'
import { GuardrailEntity } from '@/types/entity/guardrail'
import { MCPServerDetails } from '@/types/entity/mcp'
import { SETTING_TYPE_USER } from '@/utils/settings'
import toaster from '@/utils/toaster'
import { cn } from '@/utils/utils'

import { compareFormData } from '../../utils/compareFormData'
import AssistantSelector from '../AssistantSelector'
import RefineAssistantModal from '../RefineAssistantModal/RefineAssistantModal'
import { AssistantSetupSection } from './components/AssistantSetup'
import { isBackendFileUrl } from './components/AssistantSetup/utils/getFileNameFromUrl'
import ContextSelector from './components/ContextSelector'
import RefineWithAIPromptPopup from './components/RefineWithAIPromptPopup'
import ToolsConfiguration from './components/Toolkits/ToolsConfiguration'
import { useRefineAIRecommendations } from './hooks/useRefineAIRecommendations'

export const MAX_CATEGORIES = 3
const PROMPT_VARIABLE_RE = /\{\{(.*?)\}\}/g

const systemPromptVariablesValidator = (value, { parent, createError }) => {
  const availableVariables = [
    ...SYSTEM_PROMPT_VARIABLES,
    ...(parent.prompt_variables?.map((item) => item.key) || []),
  ]
  const variables = [...value.matchAll(PROMPT_VARIABLE_RE).map((match) => match[1].trim())]

  const undefinedVariables = variables.filter((variable) => !availableVariables.includes(variable))

  if (undefinedVariables.length) {
    return createError({
      message: `Unknown prompt variables: ${uniq(undefinedVariables).join(', ')}`,
      path: 'system_prompt',
    })
  }

  return true
}

const formSchema = Yup.object()
  .shape({
    project: Yup.string().required(),
    name: Yup.string().trim().required('Name is required'),
    shared: Yup.boolean().default(false),
    is_global: Yup.boolean().default(false),
    slug: Yup.string(),
    description: Yup.string().required('Description is required'),
    system_prompt: Yup.string()
      .required('System instructions are required')
      .test('format', systemPromptVariablesValidator),
    icon_url: Yup.string()
      .nullable()
      .optional()
      .test('url', 'Please enter a valid URL', (value) => {
        if (!value || isBackendFileUrl(value)) return true
        return /^https?:\/\/.+/.test(value)
      }),
    llm_model_type: Yup.string(),
    categories: Yup.array().of(Yup.string().required()),
    conversation_starters: Yup.array()
      .of(Yup.string().max(200, 'Each starter must be at most 200 characters long').default(''))
      .required(),
    nestedAssistants: Yup.array().of(
      Yup.object().shape({ id: Yup.string().required(), name: Yup.string().required() })
    ),
    temperature: Yup.number()
      .min(0, 'Temperature must be at least 0')
      .max(2, 'Temperature must be at most 2')
      .transform((value, originalValue) => (originalValue === '' ? undefined : value))
      .typeError('Temperature must be a number'),
    top_p: Yup.number()
      .min(0, 'Top P must be at least 0')
      .max(1, 'Top P must be at most 1')
      .transform((value, originalValue) => (originalValue === '' ? undefined : value))
      .typeError('Top P must be a number'),
    tools_tokens_size_limit: Yup.number()
      .min(0, 'Tools Tokens Size Limit must be at least 0')
      .transform((value, originalValue) => (originalValue === '' ? undefined : value))
      .typeError('Tools Tokens Size Limit must be a number'),
    context: Yup.array().of(
      Yup.object().shape({ name: Yup.string().required(), context_type: Yup.string().required() })
    ),
    toolkits: Yup.array().of(Yup.object()),
    is_react: Yup.boolean(),
    mcp_servers: Yup.array().of(Yup.object()),
    prompt_variables: Yup.array().default([]),
    smart_tool_selection_enabled: Yup.boolean().default(false),
    skill_ids: Yup.array()
      .of(Yup.string())
      .max(MAX_SKILLS_PER_ASSISTANT, `Maximum ${MAX_SKILLS_PER_ASSISTANT} skills allowed`)
      .default([]),
  })
  .shape(guardrailAssignmentsSchema)

export const AssistantFormContext = createContext<{
  isEditing?: boolean
  isChatConfig?: boolean
  assistant?: Assistant
  project: string
  goBack?: () => void
}>({ project: '' })

export type AssistantFormSchema = Yup.InferType<typeof formSchema>

export interface AssistantFormRef {
  submit: () => void
  addAIGeneratedFields: (values: AssistantAIGeneratedFields) => void
  handleRefineWithAI: () => void
}

interface AssistantFormProps {
  isEditing?: boolean
  isChatConfig?: boolean
  assistant?: Assistant
  onSubmit: (values: AssistantFormSchema, skipValidation?: boolean) => Promise<SubmitResponse>
  onSuccess?: () => void
  onCancel?: () => void
  showNewIntegrationPopup: (project: string, credentialType: string) => void
}

const AssistantForm = forwardRef<AssistantFormRef, AssistantFormProps>(
  (
    { isEditing, isChatConfig, assistant, onSubmit, onSuccess, onCancel, showNewIntegrationPopup },
    ref
  ) => {
    const [toolkits, setToolkits] = useState<AssistantToolkit[]>(assistant?.toolkits ?? [])

    const [mcpServers, setMcpServers] = useState<MCPServerDetails[]>(assistant?.mcp_servers ?? [])
    const [showRefinePromptPopup, setShowRefinePromptPopup] = useState(false)
    const [showRefineModal, setShowRefineModal] = useState(false)
    const [refineFields, setRefineFields] = useState<AssistantAIRefineFields>({})
    const [isSkillsEnabled] = useFeatureFlag('skills')
    const [aiGeneratedFieldMarkers, setAiGeneratedFieldMarkers] = useState<AssistantAIFieldMarkers>(
      {
        name: false,
        description: false,
        conversation_starters: false,
        system_prompt: false,
        toolkits: false,
        categories: false,
        context: false,
      }
    )

    const getSlugFromName = (name = '') => {
      return (
        name
          // @ts-expect-error: Property 'replaceAll' does not exist on type 'string'. Do you need to change your target library? Try changing the 'lib' compiler option to 'es2021' or later.ts(2550)
          .replaceAll(/\b\s+\b/g, '-')
          .replace(/[^a-zA-Z0-9-]/g, '')
          .toLowerCase()
      )
    }

    const getCategoryIds = (categories?: AssistantCategory[]): string[] => {
      if (!categories || !Array.isArray(categories)) return []

      return categories.map((cat) => {
        if (typeof cat === 'string') return cat
        if (typeof cat === 'object' && cat.id) return cat.id
        return String(cat)
      })
    }

    const { control, formState, watch, handleSubmit, setValue, getValues, trigger } =
      useForm<AssistantFormSchema>({
        mode: 'all',
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        resolver: yupResolver(formSchema) as any,
        defaultValues: {
          project: assistant?.project ?? '',
          name: assistant?.name ?? '',
          description: assistant?.description ?? '',
          categories: getCategoryIds(assistant?.categories),
          conversation_starters: assistant?.conversation_starters ?? [''],
          system_prompt: assistant?.system_prompt ?? '',
          icon_url: assistant?.icon_url ?? '',
          shared: assistant?.shared ?? false,
          is_global: assistant?.is_global ?? false,
          llm_model_type: assistant?.llm_model_type ?? '',
          slug: assistant?.slug?.length ? assistant.slug : getSlugFromName(assistant?.name),
          temperature: assistant?.temperature ?? undefined,
          top_p: assistant?.top_p ?? undefined,
          tools_tokens_size_limit: assistant?.tools_tokens_size_limit ?? undefined,
          context: assistant?.context ?? [],
          nestedAssistants: assistant?.nestedAssistants ?? [],
          prompt_variables: assistant?.prompt_variables ?? [],
          smart_tool_selection_enabled: assistant?.smart_tool_selection_enabled ?? false,
          guardrail_assignments: assistant?.guardrail_assignments ?? [],
          skill_ids: assistant?.skills?.map((s) => s.id) ?? [],
        },
      })
    const { errors } = formState

    const formId = FormIDs.ASSISTANT_FORM

    const prepareFormData = () => {
      const values = getValues()
      const preparedValues = {
        ...values,
        toolkits,
        mcp_servers: mcpServers,
        conversation_starters: values.conversation_starters?.filter(Boolean) ?? [],
      }

      preparedValues.is_react = !!assistant?.is_react
      preparedValues.slug ??= getSlugFromName(preparedValues.name)

      if (preparedValues.temperature == null || (preparedValues.temperature as unknown) === '')
        delete preparedValues.temperature
      else preparedValues.temperature = Number(preparedValues.temperature)

      if (preparedValues.top_p == null || (preparedValues.top_p as unknown) === '')
        delete preparedValues.top_p
      else preparedValues.top_p = Number(preparedValues.top_p)

      if (
        preparedValues.tools_tokens_size_limit == null ||
        (preparedValues.tools_tokens_size_limit as unknown) === ''
      )
        delete preparedValues.tools_tokens_size_limit
      else preparedValues.tools_tokens_size_limit = Number(preparedValues.tools_tokens_size_limit)

      return preparedValues
    }

    const { attemptFormClose, unblockTransition, blockTransition } = useUnsavedChanges({
      formId,
      getCurrentValues: prepareFormData,
      comparator: compareFormData,
    })

    const handleToolkitsChange = useCallback(
      (newToolkits: AssistantToolkit[] | ((prev: AssistantToolkit[]) => AssistantToolkit[])) => {
        setToolkits(newToolkits)
      },
      [] // stable: only wraps the setState setter, which never changes
    )

    const {
      isSubmitting,
      missingIntegrationsState,
      handleSubmit: handleMissingIntegrationsSubmit,
      handleSaveWithValidation,
      handleSkipValidation,
      handleCancelValidationModal,
    } = useMissingIntegrationsModal({
      onSubmit,
      onSuccess,
      unblockTransition,
      onToolkitsUpdate: handleToolkitsChange,
    })

    const handleMcpServersChange = useCallback(
      (newMcpServers: MCPServerDetails[] | ((prev: MCPServerDetails[]) => MCPServerDetails[])) => {
        setMcpServers(newMcpServers)
      },
      []
    )

    const {
      applyFieldRecommendations,
      applyToolRecommendations,
      applyContextRecommendations,
      getRefineFieldValue,
      getRefineFieldRecommendation,
    } = useRefineAIRecommendations({
      toolkits,
      setToolkits: handleToolkitsChange,
      context: watch('context') as AssistantContext[],
      setValue,
      setAiGeneratedFieldMarkers,
    })

    const handleNameChange = (newName: string, oldName: string) => {
      if (getValues('slug') === getSlugFromName(oldName)) {
        setValue('slug', getSlugFromName(newName))
      }
    }

    const handleFormSubmit = handleSubmit(async () => {
      unblockTransition()

      const values = prepareFormData()
      const result = await handleMissingIntegrationsSubmit(values)
      if (result?.error) {
        toaster.error(result.error)
      }
      if (result && !result.success) {
        blockTransition()
      }
    })

    const hasUserSettings = useMemo(() => {
      const isCreatedByCurrentUser = assistant?.created_by?.id === userStore.user?.userId || true

      if (!isCreatedByCurrentUser && (toolkits?.length || mcpServers.length)) return false
      if (mcpServers.some((ms) => ms.enabled && ms.settings?.setting_type === SETTING_TYPE_USER))
        return true

      if (toolkits.some((toolkit) => toolkit.settings?.setting_type === SETTING_TYPE_USER))
        return true

      return toolkits.some((toolkit) =>
        toolkit.tools?.some((tool) => tool.settings?.setting_type === SETTING_TYPE_USER)
      )
    }, [toolkits, mcpServers, assistant])

    const project = watch('project')
    const promptVariables = watch('prompt_variables')

    const handleCancel = useCallback(() => {
      if (onCancel) {
        attemptFormClose(onCancel)
      }
    }, [onCancel, attemptFormClose])

    const contextValue = useMemo(
      () => ({ isEditing, isChatConfig, assistant, project, goBack: handleCancel }),
      [isEditing, isChatConfig, assistant, project, handleCancel]
    )

    const addAIGeneratedFields = (fields: AssistantAIGeneratedFields) => {
      setValue('name', fields.name, { shouldValidate: true, shouldDirty: true })
      setValue('slug', getSlugFromName(fields.name), { shouldDirty: true })
      setValue('description', fields.description, { shouldValidate: true, shouldDirty: true })
      setValue('conversation_starters', fields.conversation_starters, { shouldDirty: true })
      setValue('system_prompt', fields.system_prompt, { shouldValidate: true, shouldDirty: true })
      if (toolkits.length === 0) handleToolkitsChange([...(fields.toolkits as AssistantToolkit[])])
      if (fields.categories && fields.categories.length > 0) {
        setValue('categories', fields.categories, { shouldValidate: true, shouldDirty: true })
      }

      setAiGeneratedFieldMarkers({
        name: true,
        description: true,
        conversation_starters: true,
        system_prompt: true,
        toolkits: !!toolkits.length,
        categories: !!(fields.categories && fields.categories.length > 0),
        context: false,
      })
    }

    const handleRefineWithAI = () => {
      setShowRefinePromptPopup(true)
    }

    const handleRefineWithPrompt = (refinePrompt: string) => {
      const values = getValues()
      const context = watch('context') as AssistantContext[]

      const fields: AssistantAIRefineFields = {
        name: values.name,
        description: values.description,
        conversation_starters: values.conversation_starters?.filter(Boolean),
        system_prompt: values.system_prompt,
        toolkits: toolkits.map((tk) => ({
          toolkit: tk.toolkit,
          tools: tk.tools.map((t) => ({ name: t.name, label: t.label })),
        })),
        context,
        llm_model: values.llm_model_type,
        include_context: !!context?.length,
        include_tools: !!toolkits.length,
        categories: values.categories,
        project: values.project,
      }

      // Only add refine_prompt if it's not empty
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

    useEffect(() => {
      if (hasUserSettings) {
        setValue('shared', false, { shouldDirty: false })
      }
    }, [hasUserSettings, setValue])

    useEffect(() => {
      if (!promptVariables?.length) return
      const systemPrompt = getValues('system_prompt')
      if (!systemPrompt) return
      trigger('system_prompt')
    }, [promptVariables, trigger, getValues])

    return (
      <AssistantFormContext.Provider value={contextValue}>
        <form
          onSubmit={handleFormSubmit}
          className={cn(
            'relative flex flex-col gap-y-6 p-6 pb-10 w-full',
            isChatConfig && 'pl-4 pr-2 pt-0 max-w-full'
          )}
        >
          {isChatConfig && (
            <div className="sticky top-0 bg-surface-base-sidebar z-30 pb-2 pt-4 flex justify-between items-center w-full -mb-6">
              <h2 className="font-semibold text-sm">Configure & Test</h2>
              <div className="flex gap-2">
                <Button variant="secondary" onClick={handleCancel}>
                  Cancel
                </Button>
                <Button variant="magical" onClick={handleRefineWithAI}>
                  Refine
                </Button>
                <Button onClick={handleFormSubmit}>Save</Button>
              </div>
            </div>
          )}

          <AssistantSetupSection
            control={control}
            errors={errors}
            setValue={setValue}
            hasUserSettings={hasUserSettings}
            aiGeneratedFieldMarkers={aiGeneratedFieldMarkers}
            setAiGeneratedFieldMarkers={setAiGeneratedFieldMarkers}
            promptVariables={promptVariables}
            onNameChange={handleNameChange}
            isCompactView={isChatConfig}
          />

          <Accordion
            title="Context & Data Sources"
            description="Connect your assistant to relevant data, documents, or supporting agents."
            defaultOpen={false}
          >
            <div className="px-4 pb-4 flex flex-col gap-6">
              <Controller
                name="context"
                control={control}
                render={({ field }) => (
                  <ContextSelector
                    {...field}
                    isAIGenerated={aiGeneratedFieldMarkers.context}
                    enlargedLabel
                    display="chip"
                  />
                )}
              />
              <Controller
                name="nestedAssistants"
                control={control}
                render={({ field }) => (
                  <AssistantSelector
                    {...field}
                    project={project}
                    scope={ASSISTANT_INDEX_SCOPES.PROJECT_WITH_MARKETPLACE}
                    enlargedLabel
                  />
                )}
              />
              <GuardrailAssignmentPanel
                project={project}
                entityType={GuardrailEntity.ASSISTANT}
                isEmbedded={isChatConfig}
                control={control}
                formState={formState}
                trigger={trigger}
                getValues={getValues}
              />
            </div>
          </Accordion>

          {isSkillsEnabled && (
            <Accordion
              title="Skills"
              description="Add specialized knowledge and expertise to your assistant."
              defaultOpen={false}
            >
              <div className="px-4 pb-4 flex flex-col gap-6">
                <Controller
                  name="skill_ids"
                  control={control}
                  render={({ field, fieldState }) => (
                    <SkillSelector {...field} project={project} error={fieldState.error?.message} />
                  )}
                />
              </div>
            </Accordion>
          )}

          {/* Smart Tools toggle temporarily hidden */}
          {/* <Controller
            name="smart_tool_selection_enabled"
            control={control}
            render={({ field }) => (
              <div className="flex flex-col gap-2">
                <Switch
                  label="Enable Smart Tools selection"
                  value={field.value ?? false}
                  onChange={field.onChange}
                  onBlur={field.onBlur}
                />
                <InfoBox>
                  When enabled, the assistant will intelligently analyze the user&apos;s request and automatically select only the most relevant tools from those available below. This helps optimize response quality, reduce processing time, and lower costs by avoiding unnecessary tool usage.
                </InfoBox>
              </div>
            )}
          /> */}

          <ToolsConfiguration
            toolkits={toolkits}
            mcpServers={mcpServers}
            onToolkitsChange={handleToolkitsChange}
            onMcpServersChange={handleMcpServersChange}
            showNewIntegrationPopup={showNewIntegrationPopup}
            isAIGenerated={aiGeneratedFieldMarkers.toolkits}
          />
        </form>

        <RefineWithAIPromptPopup
          isVisible={showRefinePromptPopup}
          onHide={() => setShowRefinePromptPopup(false)}
          onRefine={handleRefineWithPrompt}
        />

        <RefineAssistantModal
          visible={showRefineModal}
          onHide={() => setShowRefineModal(false)}
          refineFields={refineFields}
          onApplyFieldSuggestions={applyFieldRecommendations}
          onApplyToolSuggestions={applyToolRecommendations}
          onApplyContextSuggestions={applyContextRecommendations}
          getRefineFieldValue={getRefineFieldValue}
          getRefineFieldRecommendation={getRefineFieldRecommendation}
        />

        <MissingIntegrationsModal
          state={missingIntegrationsState}
          project={project}
          onCancel={handleCancelValidationModal}
          onSaveWithValidation={handleSaveWithValidation}
          onSkipValidation={handleSkipValidation}
          onConfigureIntegration={showNewIntegrationPopup}
          isSubmitting={isSubmitting}
        />
      </AssistantFormContext.Provider>
    )
  }
)

export default AssistantForm
