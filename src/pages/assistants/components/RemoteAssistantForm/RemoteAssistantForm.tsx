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
import { forwardRef, useCallback, useEffect, useImperativeHandle, useState } from 'react'
import { Controller, useForm } from 'react-hook-form'
import * as Yup from 'yup'

import RefreshSvg from '@/assets/icons/refresh.svg?react'
import RingSvg from '@/assets/icons/ring.svg?react'
import Button from '@/components/Button'
import Autocomplete from '@/components/form/Autocomplete'
import Input from '@/components/form/Input'
import Switch from '@/components/form/Switch'
import ProjectSelector from '@/components/ProjectSelector'
import { assistantsStore } from '@/store'
import { settingsStore } from '@/store/settings'
import { AgentCard, Assistant } from '@/types/entity/assistant'
import { Setting } from '@/types/entity/setting'
import toaster from '@/utils/toaster'
import { cn } from '@/utils/utils'

import RemoteAssistantFormCard from './RemoteAssistantFormCard'

const formSchema = Yup.object().shape({
  project: Yup.string().required(),
  shared: Yup.boolean().default(false),
  assistantName: Yup.string().trim().required('Assistant name is required'),
  integrationId: Yup.string(),
  url: Yup.string()
    .required('URL is required')
    .test('is-url', 'Please enter a valid URL', (value) => {
      if (!value) return false
      return URL.canParse(value)
    }),
})

export type RemoteAssistantFormSchema = Yup.InferType<typeof formSchema>

interface RemoteAssistantFormProps {
  assistant?: Assistant
  isEditing?: boolean
  isChatConfig?: boolean
  onSubmit: (data: RemoteAssistantFormSchema) => void
  onValidityChange?: (isValid: boolean) => void
  onCancel?: () => void
  onSuccess?: () => void
}

export interface RemoteAssistantFormRef {
  submit: () => void
  isValid: boolean
}

const RemoteAssistantForm = forwardRef<RemoteAssistantFormRef, RemoteAssistantFormProps>(
  (
    {
      assistant,
      isEditing = false,
      isChatConfig = false,
      onSubmit,
      onValidityChange,
      onCancel,
      onSuccess: _onSuccess,
    },
    ref
  ) => {
    const [fetchedAssistant, setFetchedAssistant] = useState<AgentCard | null>(null)
    const [isFetching, setIsFetching] = useState(false)
    const [integrationOptions, setIntegrationOptions] = useState<
      Array<{ value: string; label: string }>
    >([])

    const {
      control,
      handleSubmit,
      formState: { errors },
      watch,
      setValue,
      getValues,
    } = useForm({
      mode: 'onChange',
      resolver: yupResolver(formSchema),
      defaultValues: {
        url: assistant?.agent_card?.url ?? '',
        assistantName: assistant?.name ?? '',
        project: assistant?.project ?? '',
        shared: assistant?.shared ?? false,
        integrationId: assistant?.integration_id ?? undefined,
      },
    })

    const url = watch('url')
    const project = watch('project')
    const integrationId = watch('integrationId')

    const handleCancel = useCallback(() => {
      if (onCancel) {
        onCancel()
      }
    }, [onCancel])

    const fetchAssistantData = async () => {
      const urlValue = getValues('url')
      if (!urlValue) {
        toaster.error('Please enter a valid URL.')
        return
      }

      setIsFetching(true)
      setFetchedAssistant(null)
      try {
        const response = await assistantsStore.getRemoteAssistant(
          urlValue,
          project ?? '',
          integrationId ?? undefined
        )
        setFetchedAssistant(response)
        if (response?.name && !isEditing) {
          setValue('assistantName', response.name)
        }
      } catch (error: any) {
        console.error('Error fetching remote assistant:', error)
        toaster.error(error.message ?? 'Failed to fetch assistant data.')
      } finally {
        setIsFetching(false)
      }
    }

    const handleFormSubmit = handleSubmit((values) => {
      const request: any = {
        name: values.assistantName,
        agent_card: fetchedAssistant,
        project: values.project || '',
        shared: values.shared,
      }
      if (values.integrationId) {
        request.integration_id = values.integrationId
      }
      if (isEditing && assistant?.id) {
        request.id = assistant.id
      }

      onSubmit(request)
    })

    useImperativeHandle(ref, () => ({
      submit: handleFormSubmit,
      isValid: !!fetchedAssistant,
    }))

    useEffect(() => {
      const isValidOption = (option) => {
        if (option.credential_type !== 'A2A') return false
        if (option.setting_type === 'project' && option.project_name !== project) return false
        return true
      }

      const transformToOption = (option) => ({
        value: option.id,
        label: `${option.alias} (${option.setting_type})`,
      })

      const fetchIntegrations = async () => {
        try {
          const settings = await settingsStore.indexSettings()
          const options = Object.entries(settings).flatMap(([_, settingsList]) =>
            (settingsList as Setting[]).filter(isValidOption).map(transformToOption)
          )
          setIntegrationOptions(options)

          if (!options.find((option) => option.value === getValues('integrationId'))) {
            setValue('integrationId', undefined, { shouldDirty: false })
          }
        } catch (error) {
          console.error('Error loading integrations:', error)
        }
      }

      fetchIntegrations()
    }, [project])

    useEffect(() => {
      if (isEditing && assistant?.agent_card) {
        setFetchedAssistant(assistant.agent_card)
      }
    }, [isEditing, assistant])

    useEffect(() => {
      onValidityChange?.(!!fetchedAssistant)
    }, [fetchedAssistant, onValidityChange])

    return (
      <div
        className={cn(
          'flex flex-col max-w-xl mx-auto py-6',
          isChatConfig && 'pl-4 pr-2 pt-0 max-w-full max-h-full overflow-y-auto overflow-x-hidden'
        )}
      >
        {isChatConfig && (
          <div className="sticky top-0 bg-surface-base-sidebar z-30 pb-2 pt-4 flex justify-between items-center w-full mb-6">
            <h2 className="font-semibold text-sm">Configure & Test</h2>
            <div className="flex gap-2">
              <Button variant="secondary" onClick={handleCancel}>
                Cancel
              </Button>
              <Button onClick={handleFormSubmit}>Save</Button>
            </div>
          </div>
        )}

        {!isChatConfig && (
          <div className="mb-6">
            <h2 className="text-base font-semibold">Assistant Setup</h2>
            <p className="text-sm text-text-quaternary">
              Define the assistant&apos;s name, project, and visibility.
            </p>
          </div>
        )}

        <form onSubmit={handleFormSubmit} className="flex flex-col gap-6">
          <div className={cn('flex items-center gap-x-6', isChatConfig && 'flex-col items-start')}>
            <Controller
              name="project"
              control={control}
              render={({ field }) => (
                <ProjectSelector
                  label="Project name:"
                  className={cn('grow', isChatConfig && 'w-full ')}
                  value={field.value ?? ''}
                  onChange={(value) =>
                    setValue('project', Array.isArray(value) ? value[0] : value, {
                      shouldDirty: false,
                    })
                  }
                />
              )}
            />
            <Controller
              name="shared"
              control={control}
              render={({ field }) => (
                <Switch
                  {...field}
                  id="shared"
                  label="Shared with project"
                  className="pt-5"
                  value={field.value}
                />
              )}
            />
          </div>

          <div>
            <Controller
              name="integrationId"
              control={control}
              render={({ field }) => (
                <Autocomplete
                  {...field}
                  label="Integration (Optional)"
                  placeholder="Select an A2A integration"
                  options={integrationOptions}
                  value={field.value}
                />
              )}
            />
            <p className="mt-1.5 text-xs text-text-quaternary">
              Select an A2A integration to use with this remote assistant.
            </p>
          </div>

          <div className="flex items-start gap-4">
            <div className="grow">
              <Controller
                name="url"
                control={control}
                render={({ field, fieldState }) => (
                  <Input
                    {...field}
                    label={isEditing ? 'Assistant URL (read-only in edit mode)' : 'Assistant URL'}
                    placeholder="e.g., example.com or localhost:8080"
                    error={fieldState.error?.message}
                    disabled={isEditing}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' && !isEditing) {
                        e.preventDefault()
                        fetchAssistantData()
                      }
                    }}
                  />
                )}
              />
              <p className="mt-1.5 text-xs text-text-quaternary">
                URL will be appended with <code>/.well-known/agent.json</code> for fetching
                assistant card.
              </p>
            </div>
            {!isEditing && (
              <Button
                className="mt-[26px] w-14"
                onClick={fetchAssistantData}
                disabled={!url || !!errors.url || isFetching}
              >
                {isFetching && <RingSvg className="animate-spin" />}
                {!isFetching && fetchedAssistant && <RefreshSvg className="w-3 h-3" />}
                {!isFetching && !fetchedAssistant && 'Fetch'}
              </Button>
            )}
          </div>

          {fetchedAssistant && (
            <Controller
              name="assistantName"
              control={control}
              render={({ field, fieldState }) => (
                <Input
                  {...field}
                  required
                  label="Assistant Name"
                  placeholder="Enter a name for the assistant"
                  error={fieldState.error?.message}
                />
              )}
            />
          )}
        </form>

        {fetchedAssistant && (
          <RemoteAssistantFormCard
            isChatConfig={isChatConfig}
            assistant={{ ...fetchedAssistant }}
          />
        )}
      </div>
    )
  }
)

export default RemoteAssistantForm
