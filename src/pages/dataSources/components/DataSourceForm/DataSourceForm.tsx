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

import {
  memo,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  forwardRef,
  useImperativeHandle,
} from 'react'
import { Controller, SubmitHandler } from 'react-hook-form'
import { useSnapshot } from 'valtio'

import CronScheduleInput from '@/components/form/CronScheduleInput'
import InfoBox from '@/components/form/InfoBox'
import Input from '@/components/form/Input'
import Switch from '@/components/form/Switch'
import Textarea from '@/components/form/Textarea'
import GuardrailAssignmentPanel from '@/components/guardrails/GuardrailAssignmentPanel/GuardrailAssignmentPanel'
import InfoWarning from '@/components/InfoWarning'
import ProjectSelector from '@/components/ProjectSelector'
import Spinner from '@/components/Spinner/Spinner'
import {
  INDEX_TYPES,
  INDEX_TYPE_SUMMARY,
  INDEX_TYPE_CHUNK_SUMMARY,
  IndexType,
  SHAREPOINT_AUTH_TYPES,
  blockedReindexingIndexTypes,
} from '@/constants/dataSources'
import { FormIDs } from '@/constants/formIds'
import { useActiveHelpSegment } from '@/hooks/useActiveHelpSegment'
import { useUnsavedChanges } from '@/hooks/useUnsavedChangesWarning'
import { appInfoStore } from '@/store/appInfo'
import { dataSourceStore } from '@/store/dataSources'
import { userSettingsStore } from '@/store/userSettings'
import { DataSourceDetailsResponse } from '@/types/entity/dataSource'
import { GuardrailEntity } from '@/types/entity/guardrail'
import { registerIndexTypeCallback } from '@/utils/onboarding'
import { generateDefaultAlias } from '@/utils/settings'
import { cn } from '@/utils/utils'

import Divider from './Divider'
import { useIndexCreation } from './hooks/useCreateIndex'
import { useEditPopup } from './hooks/useEditPopup'
import { FormValues, useEditPopupForm } from './hooks/useEditPopupForm'
import { compareFormData } from '../../utils/compareFormData'
import { HealthCheckMessage } from '../HealthCheckMessage'
import { DataSourceTypeSelector } from '../index'
import IndexTypeField from './IndexTypeField'

export const FULL_REINDEX = 'full_reindex'

const shouldShowScheduling = (indexType: IndexType, sharepointAuthType: string | null = null) => {
  return (
    !blockedReindexingIndexTypes.has(indexType) &&
    !(
      indexType === INDEX_TYPES.SHAREPOINT &&
      sharepointAuthType !== SHAREPOINT_AUTH_TYPES.INTEGRATION
    ) &&
    Object.values(INDEX_TYPES).includes(indexType as IndexType)
  )
}

interface Props {
  onClose: () => void
  index?: DataSourceDetailsResponse | null
  onSubmittingChange?: (isSubmitting: boolean) => void
  onReadyChange?: (isReady: boolean) => void
  defaultProject?: string
  isPopup?: boolean
  isEditing?: boolean
  disabled?: boolean
}

export interface DataSourceFormRef {
  submit: () => void
  submitReindex?: () => void
  attemptFormClose?: (onSuccess: () => void, message?: string) => void
}

const DataSourceForm = forwardRef<DataSourceFormRef, Props>((props, ref) => {
  const {
    index,
    onClose,
    onSubmittingChange,
    onReadyChange,
    defaultProject,
    isPopup,
    isEditing,
    disabled,
  } = props
  const { llmModels, embeddingModels } = useSnapshot(appInfoStore)
  const { indexProviderSchemas } = useSnapshot(dataSourceStore)

  const [googleDocsGuideConfig, setGoogleDocsGuideConfig] = useState<any>(null)
  const [googleDocsGuideEnabled, setGoogleDocsGuideEnabled] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [isInitializing, setIsInitializing] = useState(true)
  const [isProviderSchemasLoaded, setIsProviderSchemasLoaded] = useState(false)
  const nameManuallyEdited = useRef(false)

  // Update parent component when isSubmitting changes
  useEffect(() => {
    if (onSubmittingChange) {
      onSubmittingChange(isSubmitting)
    }
  }, [isSubmitting, onSubmittingChange])

  // Notify parent when the form is ready for submission. Until initialization
  // finishes the form still holds default values (indexType GIT), so submitting
  // would validate against the wrong schema and silently fail.
  useEffect(() => {
    onReadyChange?.(!isInitializing)
  }, [isInitializing, onReadyChange])
  const {
    errors,
    control,
    childSubmitHandlers,
    watch,
    getValues,
    setValue,
    setError,
    register,
    handleSubmit,
    resetInitFormValues,
    clearErrors,
    formState,
    trigger,
  } = useEditPopupForm(
    index || {
      project_name: defaultProject,
    },
    isEditing
  )

  const formId = FormIDs.DATA_SOURCE_FORM

  const { attemptFormClose, unblockTransition, blockTransition } = useUnsavedChanges({
    formId,
    getCurrentValues: () => getValues(),
    comparator: compareFormData,
  })

  const handleClose = () => {
    unblockTransition()
    resetInitFormValues()
    userSettingsStore.resetIsSettingsIndexed()
    onClose()
    blockTransition()
  }

  const { createIndex, healthCheckResult } = useIndexCreation({
    setIsSubmitting,
    index,
    onClose: handleClose,
    setError,
  })

  const onSubmit: SubmitHandler<FormValues> = async (values) => {
    if (isProviderDeleted) return
    const results = await Promise.all(childSubmitHandlers.map((handler) => handler()))
    if (results.some((result) => result === false)) return
    const childValues = Object.assign({}, ...results)
    createIndex({ ...values, ...childValues })
  }

  const onSubmitFullReIndex = useCallback(async () => {
    setValue('reindexOnEdit', FULL_REINDEX)
    await handleSubmit(onSubmit)()
  }, [handleSubmit, onSubmit, setValue])

  const submit = useCallback(async () => {
    await handleSubmit(onSubmit)()
  }, [handleSubmit, onSubmit])

  useImperativeHandle(
    ref,
    () => ({
      submit,
      submitReindex: onSubmitFullReIndex,
      attemptFormClose,
    }),
    [submit, onSubmitFullReIndex, attemptFormClose]
  )

  const {
    getDefaultEmbeddingModel,
    getDefaultSummarizationModel,
    checkCustomerConfig,
    hasNoSettings,
    isDropdownShown,
    filteredSettings,
  } = useEditPopup({ getValues, setValue, watch })

  useEffect(() => {
    const initialize = async () => {
      try {
        if (!llmModels.length) await appInfoStore.getLLMModels()
        if (!embeddingModels.length) await appInfoStore.getEmbeddingsModels()

        setValue('embeddingsModel', getDefaultEmbeddingModel(getValues('embeddingsModel')!))
        setValue(
          'summarizationModel',
          getDefaultSummarizationModel(getValues('summarizationModel')!)
        )
        await userSettingsStore.indexSettings()
        await dataSourceStore.getProviderIndexSchemas()
        setIsProviderSchemasLoaded(true)
        const { googleDocsGuideEnabled, googleDocsGuideConfig } = await checkCustomerConfig()
        setGoogleDocsGuideConfig(googleDocsGuideConfig)
        setGoogleDocsGuideEnabled(googleDocsGuideEnabled)
      } finally {
        setIsInitializing(false)
      }
    }

    initialize()
  }, [llmModels.length, embeddingModels.length])

  useEffect(() => {
    const cleanup = !isInitializing
      ? registerIndexTypeCallback((type) => {
          setValue('indexType', type)
          clearErrors('indexType')
        })
      : undefined
    return cleanup
  }, [isInitializing, setValue, clearErrors])

  const projectName = getValues('projectName')

  const files = watch('files')
  const repoIndexType = watch('repoIndexType')
  const indexType = watch('indexType') as IndexType

  useEffect(() => {
    if (isEditing || nameManuallyEdited.current || !indexType) return
    const defaultName = generateDefaultAlias(indexType)
    if (defaultName) setValue('name', defaultName)
  }, [indexType])
  const sharepointAuthType = watch('sharepointAuthType')

  const providerId = index?.provider_fields?.provider_id

  const isProviderDeleted = useMemo(
    () =>
      isProviderSchemasLoaded &&
      !!index &&
      indexType === INDEX_TYPES.PROVIDER &&
      !!providerId &&
      !indexProviderSchemas.some((schema) => schema.id === providerId),
    [isProviderSchemasLoaded, indexType, providerId, indexProviderSchemas]
  )

  useActiveHelpSegment(Object.values(INDEX_TYPES).includes(indexType) ? indexType : 'provider')

  const isSummarizationPerFile = useMemo(
    () => repoIndexType === INDEX_TYPE_SUMMARY,
    [repoIndexType]
  )

  const isCodeSummarization = useMemo(
    () => repoIndexType === INDEX_TYPE_SUMMARY || repoIndexType === INDEX_TYPE_CHUNK_SUMMARY,
    [repoIndexType]
  )

  const csvPresent = useMemo(() => {
    return files?.some((file: any) => file.type === 'text/csv') ?? false
  }, [files])

  if (isInitializing) {
    return <Spinner inline rootClassName={cn('py-20', isPopup && 'py-4')} />
  }

  return (
    <div
      data-onboarding="datasource-form"
      className={cn('flex flex-col gap-4 py-10', isPopup && 'py-2')}
    >
      {isProviderDeleted && (
        <InfoWarning message="The provider for this data source is no longer available. Editing is disabled." />
      )}
      <HealthCheckMessage result={healthCheckResult} />

      <div
        className={cn(
          'flex flex-col gap-4',
          (isProviderDeleted || disabled) && 'pointer-events-none opacity-60'
        )}
      >
        <div data-onboarding="datasource-common-fields" className="flex flex-col gap-4">
          <div className="flex items-center gap-4">
            <Controller
              name="projectName"
              control={control}
              render={({ field }) => (
                <ProjectSelector
                  value={field.value ?? ''}
                  onChange={(value) =>
                    setValue('projectName', Array.isArray(value) ? value[0] : value, {
                      shouldDirty: false,
                    })
                  }
                  className="w-80"
                  disabled={!!defaultProject}
                />
              )}
            />
            <div className="flex items-center mt-6">
              <Controller
                name="projectSpaceVisible"
                control={control}
                render={({ field }) => (
                  <Switch
                    value={field.value}
                    id="projectSpaceVisible"
                    onChange={field.onChange}
                    className={
                      field.value ? 'switch-active-gradient whitespace-nowrap' : 'whitespace-nowrap'
                    }
                    label="Shared with project"
                  />
                )}
              />
            </div>
          </div>

          <Controller
            name="name"
            control={control}
            render={({ field, fieldState }) => (
              <Input
                {...field}
                label="Name"
                type="secondary"
                id="name"
                name="name"
                error={fieldState.error?.message}
                disabled={!!index}
                maxLength={50}
                minLength={4}
                autoFocus={isPopup}
                onChange={(e) => {
                  nameManuallyEdited.current = true
                  field.onChange(e)
                }}
              />
            )}
          />

          <Controller
            name="description"
            control={control}
            render={({ field, fieldState }) => (
              <Textarea
                id="description"
                name="description"
                label="Description"
                className="col-span-2"
                value={field.value}
                onChange={field.onChange}
                onBlur={field.onBlur}
                error={fieldState.error?.message}
                rows={4}
              />
            )}
          />

          <InfoBox text="Ensure a comprehensive data source description; it's utilized by our LLM for enhanced processing." />
        </div>

        <GuardrailAssignmentPanel
          project={projectName}
          entityType={GuardrailEntity.KNOWLEDGEBASE}
          control={control}
          formState={formState}
          trigger={trigger}
          getValues={getValues}
        />

        {!index && <Divider />}

        <div data-onboarding="datasource-type-selector-section">
          <Controller
            name="indexType"
            control={control}
            render={({ field: indexTypeField }) => (
              <Controller
                name="indexMetadata"
                control={control}
                render={({ field: metadataField }) => (
                  <DataSourceTypeSelector
                    indexType={indexTypeField.value}
                    onIndexTypeChange={indexTypeField.onChange}
                    indexMetadata={metadataField.value ?? {}}
                    onIndexMetadataChange={metadataField.onChange}
                    clearErrors={clearErrors}
                    hidden={!!index}
                  />
                )}
              />
            )}
          />
        </div>

        <Controller
          name="indexType"
          control={control}
          render={({ field }) => (
            <>
              {field.value === INDEX_TYPES.GIT && (
                <IndexTypeField.Git
                  {...{
                    control,
                    embeddingModels,
                    errors,
                    filteredSettings,
                    index,
                    isCodeSummarization,
                    isSummarizationPerFile,
                    llmModels,
                    projectName,
                    register,
                    value: field.value,
                    hasNoSettings: hasNoSettings(field.value),
                    isDropdownShown: isDropdownShown(field.value),
                    onIntegrationCreated: () => {
                      userSettingsStore.resetIsSettingsIndexed()
                      userSettingsStore.indexSettings()
                    },
                  }}
                />
              )}
              {field.value === INDEX_TYPES.SVN && (
                <IndexTypeField.Svn
                  {...{
                    control,
                    embeddingModels,
                    errors,
                    filteredSettings,
                    index,
                    projectName,
                    register,
                    value: field.value,
                    hasNoSettings: hasNoSettings(field.value),
                    isDropdownShown: isDropdownShown(field.value),
                    onIntegrationCreated: () => {
                      userSettingsStore.resetIsSettingsIndexed()
                      userSettingsStore.indexSettings()
                    },
                  }}
                />
              )}
              {!index && field.value === INDEX_TYPES.GOOGLE && (
                <IndexTypeField.Google
                  {...{
                    errors,
                    control,
                    googleDocsGuideConfig,
                    googleDocsGuideEnabled,
                    embeddingModels,
                    projectName,
                    hasNoSettings,
                    isDropdownShown,
                    filteredSettings,
                    onIntegrationCreated: () => {
                      userSettingsStore.resetIsSettingsIndexed()
                      userSettingsStore.indexSettings()
                    },
                  }}
                />
              )}
              {field.value === INDEX_TYPES.FILE && (
                <IndexTypeField.File
                  {...{
                    errors,
                    control,
                    register,
                    csvPresent,
                    embeddingModels,
                    isSubmitted: formState.isSubmitted,
                  }}
                />
              )}
              {field.value === INDEX_TYPES.CONFLUENCE && (
                <IndexTypeField.Confluence
                  {...{
                    value: field.value,
                    errors,
                    control,
                    register,
                    projectName,
                    hasNoSettings,
                    isDropdownShown,
                    filteredSettings,
                    embeddingModels,
                    onIntegrationCreated: () => {
                      userSettingsStore.resetIsSettingsIndexed()
                      userSettingsStore.indexSettings()
                    },
                  }}
                />
              )}
              {field.value === INDEX_TYPES.JIRA && (
                <IndexTypeField.Jira
                  {...{
                    errors,
                    control,
                    register,
                    projectName,
                    hasNoSettings,
                    isDropdownShown,
                    filteredSettings,
                    value: field.value,
                    embeddingModels,
                    onIntegrationCreated: () => {
                      userSettingsStore.resetIsSettingsIndexed()
                      userSettingsStore.indexSettings()
                    },
                  }}
                />
              )}
              {field.value === INDEX_TYPES.XRAY && (
                <IndexTypeField.Xray
                  {...{
                    errors,
                    control,
                    projectName,
                    hasNoSettings,
                    isDropdownShown,
                    filteredSettings,
                    value: field.value,
                    embeddingModels,
                    onIntegrationCreated: () => {
                      userSettingsStore.resetIsSettingsIndexed()
                      userSettingsStore.indexSettings()
                    },
                  }}
                />
              )}
              {field.value === INDEX_TYPES.AZURE_DEVOPS_WIKI && (
                <IndexTypeField.AzureDevOpsWiki
                  {...{
                    errors,
                    control,
                    projectName,
                    hasNoSettings,
                    isDropdownShown,
                    filteredSettings,
                    value: field.value,
                    embeddingModels,
                    onIntegrationCreated: () => {
                      userSettingsStore.resetIsSettingsIndexed()
                      userSettingsStore.indexSettings()
                    },
                  }}
                />
              )}
              {field.value === INDEX_TYPES.AZURE_DEVOPS_WORK_ITEM && (
                <IndexTypeField.AzureDevOpsWorkItem
                  {...{
                    errors,
                    control,
                    projectName,
                    hasNoSettings,
                    isDropdownShown,
                    filteredSettings,
                    value: field.value,
                    embeddingModels,
                    setValue,
                    watch,
                    onIntegrationCreated: () => {
                      userSettingsStore.resetIsSettingsIndexed()
                      userSettingsStore.indexSettings()
                    },
                  }}
                />
              )}
              {field.value === INDEX_TYPES.SHAREPOINT && (
                <IndexTypeField.SharePoint
                  {...{
                    errors,
                    control,
                    projectName,
                    hasNoSettings,
                    isDropdownShown,
                    filteredSettings,
                    value: field.value,
                    embeddingModels,
                    setValue,
                    watch,
                    onIntegrationCreated: () => {
                      userSettingsStore.resetIsSettingsIndexed()
                      userSettingsStore.indexSettings()
                    },
                  }}
                />
              )}
              {(!Object.values(INDEX_TYPES).includes(field.value as IndexType) ||
                field.value === INDEX_TYPES.PROVIDER) && (
                <IndexTypeField.Provider
                  {...{
                    index,
                    control,
                    projectName,
                    errors,
                    setValue: setValue as (name: string, value: any, options?: any) => void,
                  }}
                />
              )}

              {shouldShowScheduling(field.value as IndexType, sharepointAuthType) && (
                <>
                  <Divider />
                  <div data-onboarding="datasource-schedule-field">
                    <Controller
                      name="cronExpression"
                      control={control}
                      render={({ field: cronField, fieldState }) => (
                        <CronScheduleInput
                          value={cronField.value ?? undefined}
                          onChange={cronField.onChange}
                          error={fieldState.error?.message}
                          hint="Set up automatic reindexing schedule for this datasource. Manual reindexing will always be available."
                        />
                      )}
                    />
                  </div>
                </>
              )}
            </>
          )}
        />
      </div>
    </div>
  )
})

// Create a memoized version of the component
const MemoizedDataSourceForm = memo(DataSourceForm, (prevProps, nextProps) => {
  if (prevProps.index?.id !== nextProps.index?.id) return false
  if (prevProps.onSubmittingChange !== nextProps.onSubmittingChange) return false
  if (prevProps.onReadyChange !== nextProps.onReadyChange) return false
  if (prevProps.disabled !== nextProps.disabled) return false

  return true
})

export default MemoizedDataSourceForm
