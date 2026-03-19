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

import { FC, useCallback, useEffect, useRef, useState } from 'react'
import { Control, Controller, FieldErrors, UseFormSetValue, UseFormWatch } from 'react-hook-form'

import FormAutocomplete from '@/components/form/FormAutocomplete'
import Input from '@/components/form/Input'
import RadioGroup from '@/components/form/RadioGroup/RadioGroup'
import { SHAREPOINT_AUTH_TYPES } from '@/constants/dataSources'
import { useTheme } from '@/hooks/useTheme'

import { FormValues } from '../hooks/useEditPopupForm'
import { useSharePointOAuth } from '../hooks/useSharePointOAuth'
import IntegrationSection from './shared/IntegrationSection'
import { useIntegrationManager } from './shared/useIntegrationManager'
import SharePointContentTypesSection from './SharePointContentTypesSection'
import SharePointMicrosoftSignIn from './SharePointMicrosoftSignIn'

interface SettingOption {
  id: string
  project_name: string
  is_global: boolean
}

interface Props {
  errors: FieldErrors<FormValues>
  hasNoSettings: (indexType: string) => boolean
  value: string
  projectName: string
  isDropdownShown: (indexType: string) => boolean
  control: Control<FormValues>
  filteredSettings: Record<string, SettingOption[]>
  embeddingModels: { value: string; label: string }[]
  setValue: UseFormSetValue<FormValues>
  watch: UseFormWatch<FormValues>
  onIntegrationCreated?: () => void
}

const { INTEGRATION, OAUTH_CODEMIE, OAUTH_CUSTOM } = SHAREPOINT_AUTH_TYPES

const AUTH_METHOD_OPTIONS = [
  {
    value: INTEGRATION,
    label: 'Use Integration',
    tooltip:
      'Authenticate using an Azure AD app registration (client ID, tenant ID, and client secret). Best for service accounts and automated access.',
  },
  {
    value: OAUTH_CODEMIE,
    label: 'Sign in with Microsoft (CodeMie Project)',
    tooltip:
      'Sign in with your Microsoft work account via the CodeMie Azure app. Best for accessing EPAM SharePoint sites with your personal credentials.',
  },
  {
    value: OAUTH_CUSTOM,
    label: 'Sign in with Microsoft (Custom Project)',
    tooltip:
      'Sign in with your Microsoft account via your own Azure app registration. Best for accessing private or external SharePoint tenants with a custom app.',
  },
]

const IndexTypeSharePoint: FC<Props> = ({
  errors,
  hasNoSettings,
  value,
  projectName,
  isDropdownShown,
  control,
  filteredSettings,
  embeddingModels,
  setValue,
  watch,
  onIntegrationCreated,
}) => {
  const {
    showIntegrationPopup,
    handleIntegrationSuccess,
    handleIntegrationCancel,
    openIntegrationPopup,
  } = useIntegrationManager({ onIntegrationCreated })

  const { isDark } = useTheme()

  const isEditing = watch('isEditing')
  const storedAuthType = watch('sharepointAuthType') ?? INTEGRATION
  const [authMethod, setAuthMethod] = useState<string>(storedAuthType)

  const { oauthStatus, oauthUsername, oauthError, deviceCode, handleSignIn, onAuthMethodChange, initForEditMode } =
    useSharePointOAuth({ projectName, setValue, initialAuthType: isEditing ? storedAuthType : INTEGRATION })

  // Sync authMethod when editing an existing datasource (storedAuthType populated from defaults).
  // Use a ref to track the previous stored value so the effect only fires on actual changes,
  // without adding authMethod as a dependency (which would re-run on every user selection).
  const prevStoredAuthTypeRef = useRef(storedAuthType)
  useEffect(() => {
    if (!storedAuthType || storedAuthType === prevStoredAuthTypeRef.current) return
    prevStoredAuthTypeRef.current = storedAuthType
    setAuthMethod(storedAuthType)
    if (isEditing) {
      initForEditMode(storedAuthType)
    }
  }, [storedAuthType, initForEditMode, isEditing])

  const handleAuthMethodChange = useCallback(
    (v: string) => {
      const newMethod = String(v)
      onAuthMethodChange(authMethod, newMethod)
      setAuthMethod(newMethod)
      prevStoredAuthTypeRef.current = newMethod
      setValue('sharepointAuthType', newMethod)
    },
    [authMethod, onAuthMethodChange, setValue]
  )

  const isMicrosoftAuth = authMethod === OAUTH_CODEMIE || authMethod === OAUTH_CUSTOM

  const handleMicrosoftSignIn = useCallback(() => {
    const customClientId =
      authMethod === OAUTH_CUSTOM ? (watch('sharepointCustomClientId') ?? '') : undefined
    const tenantId =
      authMethod === OAUTH_CUSTOM ? (watch('sharepointTenantId') ?? '') : undefined
    handleSignIn(customClientId || undefined, tenantId || undefined)
  }, [authMethod, watch, handleSignIn])

  return (
    <div>
      <Controller
        name="siteUrl"
        control={control}
        render={({ field }) => (
          <Input
            {...field}
            id="siteUrl"
            name="siteUrl"
            className="w-full"
            rootClass="mb-3"
            label="SharePoint Site URL:"
            placeholder="https://yourtenant.sharepoint.com/sites/YourSite"
            error={errors.siteUrl?.message}
          />
        )}
      />

      <SharePointContentTypesSection control={control} />

      <div className="mb-4">
        <p className="mb-2 text-xs text-text-tertiary">Authentication Method:</p>
        <RadioGroup
          name="sharepointAuthMethod"
          options={AUTH_METHOD_OPTIONS}
          value={authMethod}
          onChange={(v) => handleAuthMethodChange(String(v))}
        />
      </div>

      {authMethod === INTEGRATION && (
        <IntegrationSection
          hasNoSettings={hasNoSettings(value)}
          isDropdownShown={isDropdownShown(value)}
          datasourceType={value}
          projectName={projectName}
          control={control}
          errors={errors}
          filteredSettings={filteredSettings}
          showIntegrationPopup={showIntegrationPopup}
          onOpenIntegrationPopup={openIntegrationPopup}
          onIntegrationSuccess={handleIntegrationSuccess}
          onIntegrationCancel={handleIntegrationCancel}
          integrationLabel="Select integration for SharePoint:"
          integrationPlaceholder="Integration for SharePoint"
          credentialType="sharepoint"
        />
      )}

      {authMethod === OAUTH_CUSTOM && (
        <>
          <Controller
            name="sharepointCustomClientId"
            control={control}
            render={({ field }) => (
              <Input
                {...field}
                id="sharepointCustomClientId"
                name="sharepointCustomClientId"
                className="w-full"
                rootClass="mb-3"
                label="Azure Application (client) ID:"
                placeholder="xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx"
                error={errors.sharepointCustomClientId?.message}
              />
            )}
          />
          <Controller
            name="sharepointTenantId"
            control={control}
            render={({ field }) => (
              <Input
                {...field}
                id="sharepointTenantId"
                name="sharepointTenantId"
                className="w-full"
                rootClass="mb-3"
                label="Azure Directory (tenant) ID:"
                placeholder="xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx"
                error={errors.sharepointTenantId?.message}
              />
            )}
          />
        </>
      )}

      {isMicrosoftAuth && (
        <SharePointMicrosoftSignIn
          oauthStatus={oauthStatus}
          oauthUsername={oauthUsername}
          oauthError={oauthError}
          deviceCode={deviceCode}
          onSignIn={handleMicrosoftSignIn}
          isDark={isDark}
        />
      )}

      <FormAutocomplete
        name="embeddingsModel"
        control={control}
        id="embeddingsModel"
        label="Model used for embeddings"
        options={embeddingModels}
        placeholder="Embeddings Model Type"
      />
    </div>
  )
}

export default IndexTypeSharePoint
