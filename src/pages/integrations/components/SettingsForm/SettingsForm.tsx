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
import { forwardRef, useImperativeHandle, useState, useEffect, useMemo } from 'react'
import { useForm, Controller, useWatch } from 'react-hook-form'
import { useSnapshot } from 'valtio'
import * as Yup from 'yup'

import Button from '@/components/Button'
import Autocomplete from '@/components/form/Autocomplete'
import Input from '@/components/form/Input'
import RecordInput from '@/components/form/RecordInput/RecordInput'
import Switch from '@/components/form/Switch'
import InfoMessage from '@/components/Message/Message'
import ProjectSelector from '@/components/ProjectSelector'
import { useActiveHelpSegment } from '@/hooks/useActiveHelpSegment'
import { appInfoStore } from '@/store/appInfo'
import { userStore } from '@/store/user'
import { CredentialComponentPosition, CredentialComponentType } from '@/types/settingsUI'
import api from '@/utils/api'
import { registerCredentialTypeCallback } from '@/utils/onboarding'
import {
  getConfigItem,
  getAvailableCredentialsTypes,
  getCredentialUIMapping,
  getOriginalCredentialType,
  convertCredsToKeyValue,
  SETTING_TYPE_USER,
  getDefaultUrl,
  getCredentialMessage,
  getTestableCredentialTypes,
  getSettingsFieldsSectionTitle,
  SETTING_TYPE_PROJECT,
} from '@/utils/settings'

import SettingFormMessage from '../SettingFormMessage/SettingFormMessage'
import TestIntegration from '../TestIntegration'
import CredentialFields from './CredentialFields'

export interface SettingsFormRef {
  submit: () => void
}

interface SettingsFormProps {
  onSubmit: (values: Record<string, unknown>) => void | Promise<void>
  onClose?: () => void
  submitText?: string
  editing?: boolean
  projectName?: string
  settingId?: string
  settingAlias?: string
  credentialType?: string
  credentialKey?: string
  credentialValues?: Record<string, string>
  isGlobal?: boolean
  hideActions?: boolean
  settingType?: 'user' | 'project'
  disableProject?: boolean
  disableType?: boolean
  onCredentialValuesChange?: (values: Record<string, string>) => void
  onCredentialTypeChange?: (type: string) => void
  shouldAutofocusInput?: boolean
}

const ALIAS_REQUIRED_ERR = 'Alias is required'

const SettingsForm = forwardRef<SettingsFormRef, SettingsFormProps>((props, ref) => {
  const {
    onSubmit,
    onClose,
    submitText,
    editing = false,
    projectName: initialProjectName,
    settingId,
    settingAlias: initialSettingAlias,
    credentialType: initialCredentialType,
    credentialValues: initialCredentialValues,
    isGlobal: initialIsGlobal,
    hideActions = false,
    settingType = SETTING_TYPE_USER,
    disableProject = false,
    disableType = false,
    onCredentialValuesChange,
    onCredentialTypeChange,
    shouldAutofocusInput = false,
  } = props

  const { user } = useSnapshot(userStore)

  const [projectName, setProjectName] = useState(initialProjectName || '')
  const [isGlobal, setIsGlobal] = useState(initialIsGlobal || false)
  const [customerConfig, setCustomerConfig] = useState<any>(null)

  const CREDENTIAL_TYPES = useMemo(() => {
    return getAvailableCredentialsTypes({
      settingType,
      user,
      project: projectName,
    })
  }, [settingType, user, projectName])

  const CREDENTIAL_VALUES_MAPPING = useMemo(() => {
    return getCredentialUIMapping({
      settingType,
      user,
      project: projectName,
    })
  }, [settingType, user, projectName])

  const [credentialType, setCredentialType] = useState(
    initialCredentialType?.toLowerCase() ?? CREDENTIAL_TYPES[0]
  )
  const [manualCredentialValues, setManualCredentialValues] = useState<
    { key: string; value: string }[]
  >(() => {
    const hasManualConfig = CREDENTIAL_VALUES_MAPPING[credentialType]?.fieldsManualConfiguration
    return hasManualConfig && initialCredentialValues
      ? convertCredsToKeyValue(initialCredentialValues)
      : []
  })

  const getCredentialDefaults = (credentialType: string) => {
    const defaultUrl = getDefaultUrl(credentialType)
    const config = CREDENTIAL_VALUES_MAPPING[credentialType]
    const defaults: Record<string, any> = {}

    if (defaultUrl) {
      defaults.url = defaultUrl
    }

    if (config?.fields) {
      Object.entries(config.fields).forEach(([fieldName, fieldConfig]) => {
        if (fieldConfig.defaultValue !== undefined) {
          defaults[fieldName] = fieldConfig.defaultValue
        }
      })
    }

    return defaults
  }

  const getInitialCredentialValues = () => {
    const defaults = getCredentialDefaults(credentialType)

    if (initialCredentialValues) {
      // Merge existing values with defaults to ensure all fields with defaultValue are populated
      return { ...defaults, ...initialCredentialValues }
    }

    const hasManualConfig = CREDENTIAL_VALUES_MAPPING[credentialType]?.fieldsManualConfiguration
    if (hasManualConfig) return {}

    return defaults
  }

  const formSchema = useMemo(() => {
    const schema: Record<string, Yup.Schema> = {
      alias: Yup.string().required(ALIAS_REQUIRED_ERR),
    }

    const config = CREDENTIAL_VALUES_MAPPING[credentialType]
    Object.entries(config.fields).forEach(([key, fieldConfig]) => {
      if (fieldConfig.type === CredentialComponentType.message) return

      schema[key] = fieldConfig.validation || Yup.string().nullable().optional()
    })

    return Yup.object(schema)
  }, [CREDENTIAL_VALUES_MAPPING, credentialType])

  const {
    control,
    setValue: setFormValue,
    getValues,
    trigger,
    reset,
  } = useForm({
    mode: 'onChange',
    resolver: yupResolver(formSchema),
    defaultValues: getInitialCredentialValues(),
  })

  const formValues = useWatch({ control })

  const mappingExists = useMemo(() => {
    return CREDENTIAL_VALUES_MAPPING[credentialType] !== undefined
  }, [CREDENTIAL_VALUES_MAPPING, credentialType])

  const credentialTypeOptions = useMemo(() => {
    return CREDENTIAL_TYPES.map((type) => ({
      label: CREDENTIAL_VALUES_MAPPING[type]?.displayName || getOriginalCredentialType(type),
      value: type,
    }))
  }, [CREDENTIAL_TYPES, CREDENTIAL_VALUES_MAPPING])

  useEffect(() => {
    const loadConfig = async () => {
      const config = await appInfoStore.fetchCustomerConfig()
      setCustomerConfig(config)
    }
    loadConfig()
  }, [])

  useEffect(() => {
    if (onCredentialValuesChange) {
      onCredentialValuesChange(
        Object.fromEntries(Object.entries(formValues).filter(([_, value]) => value !== undefined))
      )
    }
  }, [formValues, onCredentialValuesChange])

  useActiveHelpSegment(credentialType)

  useEffect(() => {
    if (onCredentialTypeChange) {
      onCredentialTypeChange(credentialType)
    }
  }, [credentialType, onCredentialTypeChange])

  useEffect(() => {
    if (initialSettingAlias) {
      setFormValue('alias', initialSettingAlias)
    }
  }, [initialSettingAlias, setFormValue])

  const handleCredentialTypeChange = (newType: string) => {
    setCredentialType(newType)

    const hasManualConfig = CREDENTIAL_VALUES_MAPPING[newType]?.fieldsManualConfiguration
    if (hasManualConfig) {
      setManualCredentialValues([])
    }

    reset({ alias: getValues('alias'), ...getCredentialDefaults(newType) })
  }

  useEffect(() => {
    return registerCredentialTypeCallback(handleCredentialTypeChange)
    // handleCredentialTypeChange closes over stable React state setters and form methods
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const buildWebhookURL = (value: string) => {
    const webhookId = value && value.trim() !== '' ? value : '<id>'
    return `${api.BASE_URL}/v1/webhooks/${webhookId}`
  }

  const isMessagePresent = (credType: string) => {
    const messageConfig = getCredentialMessage(credType)
    if (!messageConfig) return false

    // Check shouldShow function if present
    if (messageConfig.shouldShow && !messageConfig.shouldShow(formValues)) {
      return false
    }

    if (!messageConfig.configKey) return true

    if (!customerConfig) return false
    const config = getConfigItem(customerConfig, messageConfig.configKey)
    return config?.settings?.enabled !== false
  }

  const submit = async () => {
    const isValid = await trigger()
    if (!isValid) {
      return
    }

    const hasManualConfig = CREDENTIAL_VALUES_MAPPING[credentialType]?.fieldsManualConfiguration
    const credential_values = hasManualConfig
      ? manualCredentialValues.filter((item) => item.key && item.value)
      : convertCredsToKeyValue(getValues()).filter(({ value }) => value !== undefined)

    onSubmit({
      project_name: projectName,
      alias: getValues('alias'),
      credential_type: getOriginalCredentialType(credentialType),
      credential_values,
      is_global: isGlobal,
    })
  }

  useImperativeHandle(ref, () => ({
    submit,
  }))

  return (
    <>
      <form
        className="flex flex-col w-full gap-y-6 pt-6 px-6 mx-auto max-w-5xl pb-8"
        onSubmit={(e) => {
          e.preventDefault()
          submit()
        }}
      >
        <div data-onboarding="integration-project-scope-fields" className="flex flex-col gap-y-6">
          <ProjectSelector
            value={projectName}
            onChange={(e: any) => {
              const val = typeof e === 'string' ? e : e.value
              setProjectName(val)
            }}
            label="Project:"
            disabled={editing || disableProject || isGlobal}
            adminOnly={settingType === SETTING_TYPE_PROJECT}
          />

          {CREDENTIAL_VALUES_MAPPING[credentialType] && (
            <CredentialFields
              control={control}
              credentialFields={CREDENTIAL_VALUES_MAPPING[credentialType].fields}
              buildWebhookURL={buildWebhookURL}
              position={CredentialComponentPosition.top}
            />
          )}

          {settingType === SETTING_TYPE_USER && (
            <div className="flex flex-col gap-4">
              <div className="flex items-center gap-2">
                <Switch
                  id="isGlobal"
                  value={isGlobal}
                  onChange={(e) => setIsGlobal(e.target.checked)}
                  label="Global Integration"
                />
              </div>
              <InfoMessage>
                By enabling, it will become versatile and can be applied across multiple projects
                without being tied to any specific one.
              </InfoMessage>
            </div>
          )}
        </div>

        <div data-onboarding="integration-credential-type-field">
          <Autocomplete
            id="credentialType"
            value={credentialType}
            name="credentialType"
            placeholder="Credential Type"
            label="Credential Type:"
            allowEmpty={false}
            options={credentialTypeOptions}
            disabled={editing || disableType}
            onChange={handleCredentialTypeChange}
          />
        </div>

        <div data-onboarding="integration-alias-field">
          <Controller
            name="alias"
            control={control}
            render={({ field, fieldState }) => (
              <Input
                {...field}
                id="settingAlias"
                name="settingAlias"
                placeholder="Alias*"
                label="Alias:"
                error={fieldState.error?.message}
                autoFocus={shouldAutofocusInput}
              />
            )}
          />
        </div>

        {isMessagePresent(credentialType) && getCredentialMessage(credentialType) && (
          <SettingFormMessage message={getCredentialMessage(credentialType)!} />
        )}

        <div data-onboarding="integration-credential-fields" className="flex flex-col gap-y-6">
          {CREDENTIAL_VALUES_MAPPING[credentialType]?.fieldsManualConfiguration ? (
            <RecordInput
              id="manualFields"
              value={manualCredentialValues}
              onChange={setManualCredentialValues}
              name="manualFields"
              label={CREDENTIAL_VALUES_MAPPING[credentialType].fieldsManualConfiguration.label}
              sensitive={
                CREDENTIAL_VALUES_MAPPING[credentialType].fieldsManualConfiguration.sensitive
              }
              addText={CREDENTIAL_VALUES_MAPPING[credentialType].fieldsManualConfiguration.addText}
            />
          ) : (
            <>
              <div className="-mt-3 -mb-2">
                <hr className="opacity-25 mb-6 border-border-structural" />
                {getSettingsFieldsSectionTitle(credentialType) && (
                  <h4 className="text-sm font-medium">
                    {getSettingsFieldsSectionTitle(credentialType)}
                  </h4>
                )}
              </div>
              {CREDENTIAL_VALUES_MAPPING[credentialType] && (
                <CredentialFields
                  control={control}
                  credentialFields={CREDENTIAL_VALUES_MAPPING[credentialType].fields}
                  buildWebhookURL={buildWebhookURL}
                />
              )}
            </>
          )}
        </div>

        <InfoMessage>
          Important note: Your sensitive information is encrypted for security and displayed here in
          a masked format. If you&apos;re updating non-sensitive information, there&apos;s no need
          to modify the masked values — they will remain unchanged and secure.
        </InfoMessage>

        {!mappingExists && (
          <div className="text-xl">
            <p>Not implemented yet 😔</p>
          </div>
        )}
      </form>

      {!hideActions && (
        <div className="sticky bottom-0 bg-surface-base-secondary p-6 !pr-2">
          <div className="flex flex-row justify-end gap-3">
            {onClose && (
              <Button type="secondary" onClick={onClose}>
                Cancel
              </Button>
            )}

            {getTestableCredentialTypes().includes(credentialType) && (
              <TestIntegration
                credentialType={credentialType}
                credentialValues={getValues()}
                settingId={settingId}
                label="Test Integration"
              />
            )}

            <Button onClick={submit}>{submitText || 'Save'}</Button>
          </div>
        </div>
      )}
    </>
  )
})

SettingsForm.displayName = 'SettingsForm'

export default SettingsForm
