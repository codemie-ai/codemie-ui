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

import { USER_TYPE_EXTERNAL } from '@/constants'
import { CREDENTIAL_DEFAULTS } from '@/constants/settings'
import { userStore } from '@/store'
import { SettingCredentialValue } from '@/types/entity'
import { ConfigItem } from '@/types/entity/configuration'
import {
  CredentialUIMap,
  CredentialAccessType,
  GetCredentialsMappingParams,
  CredentialRoleRestriction,
} from '@/types/settingsUI'
import { isEnterpriseEdition } from '@/utils/enterpriseEdition'
import { capitalize, formatDate } from '@/utils/helpers'
import { CREDENTIAL_UI_MAPPING } from '@/utils/settingsUIConfig'
import { isUserProjectAdmin } from '@/utils/user'

export const SETTING_TYPE_USER = 'user'
export const SETTING_TYPE_PROJECT = 'project'

export const getSettingCredsURL = (
  credentialValues: SettingCredentialValue[],
  credentialType: string
): string => {
  const credConfig = CREDENTIAL_UI_MAPPING[credentialType]
  const defaultUrl = credConfig?.defaultUrl ?? CREDENTIAL_DEFAULTS.defaultUrl
  const urlObj = credentialValues.find((cv) => cv.key === 'url')
  return (urlObj?.value as string) || defaultUrl
}

export const getCredentialUIMapping = ({
  settingType,
  user,
  project,
  checkIfAdminOfAnyProject = false,
  customerConfig,
}: GetCredentialsMappingParams): CredentialUIMap => {
  const isProjectAdmin = isUserProjectAdmin(user, project, checkIfAdminOfAnyProject)
  const isEnterprise = isEnterpriseEdition()

  // Filter credentials based on access type
  const filteredCredentials: CredentialUIMap = {}

  Object.entries(CREDENTIAL_UI_MAPPING).forEach(([key, config]) => {
    const accessType = config.accessType ?? CREDENTIAL_DEFAULTS.accessType
    const roleRestriction = config.roleRestrictionType ?? CREDENTIAL_DEFAULTS.roleRestrictionType
    const enterpriseOnly = config.enterpriseOnly ?? false
    const personalFeatureAllowsUserCredential =
      settingType === SETTING_TYPE_USER &&
      roleRestriction === CredentialRoleRestriction.ADMIN_ONLY &&
      isConfigItemEnabled(customerConfig ?? [], config.personalFeatureFlag ?? '')

    if (
      roleRestriction === CredentialRoleRestriction.ADMIN_ONLY &&
      !isProjectAdmin &&
      !personalFeatureAllowsUserCredential
    ) {
      return
    }

    if (enterpriseOnly && !isEnterprise) {
      return
    }

    // For user settings, only include USER access type
    if (
      settingType === SETTING_TYPE_USER &&
      (accessType === CredentialAccessType.USER_ONLY || accessType === CredentialAccessType.ALL)
    ) {
      filteredCredentials[key] = config
    }

    if (
      settingType === SETTING_TYPE_PROJECT &&
      (accessType === CredentialAccessType.PROJECT_ONLY || accessType === CredentialAccessType.ALL)
    ) {
      filteredCredentials[key] = config
    }
  })

  return filteredCredentials
}

export const getAvailableCredentialsTypes = ({
  checkIfAdminOfAnyProject = false,
  ...params
}: GetCredentialsMappingParams): string[] => {
  return Object.keys(getCredentialUIMapping({ checkIfAdminOfAnyProject, ...params }))
}

export const getOriginalCredentialType = (value: string): string => {
  // Return the serverEnum (backend enum) from config if available (e.g., "AWS", "GCP", "Xray")
  // Otherwise fall back to capitalized value (e.g., "Jira")
  const credConfig = CREDENTIAL_UI_MAPPING[value]
  return credConfig?.serverEnum || capitalize(value)
}

// Get all testable credential types
export const getTestableCredentialTypes = (): string[] => {
  return Object.entries(CREDENTIAL_UI_MAPPING)
    .filter(([, config]) => config.testable ?? CREDENTIAL_DEFAULTS.testable)
    .map(([key]) => key)
}

// Get message for a specific credential type
export const getCredentialMessage = (credentialType: string) => {
  const credConfig = CREDENTIAL_UI_MAPPING[credentialType]
  return credConfig?.message
}

// Get default URL for a credential type
export const getDefaultUrl = (credentialType: string): string => {
  const credConfig = CREDENTIAL_UI_MAPPING[credentialType]
  return credConfig?.defaultUrl ?? CREDENTIAL_DEFAULTS.defaultUrl
}

export const convertCredsToKeyValue = (
  credentialValues: Record<string, string> | undefined
): { key: string; value: string }[] => {
  if (!credentialValues) return []

  return Object.entries(credentialValues).map(([key, value]) => {
    if (typeof value === 'object' && value && 'key' in value && 'value' in value) {
      return value as { key: string; value: string }
    }
    return { key, value }
  })
}

export function getConfigItem(config: unknown, id: string): ConfigItem | null {
  if (Array.isArray(config)) {
    return config.find((item: any) => item.id === id)
  }
  if (typeof config === 'object' && config !== null) {
    return Object.values(config).find((item: any) => item.id === id)
  }
  return null
}

export function isConfigItemEnabled(config: readonly ConfigItem[], id: string): boolean {
  const settings = getConfigItemSettings(config, id)
  if (!settings?.enabled) return false
  const isExternalUser = userStore.user?.user_type === USER_TYPE_EXTERNAL

  // Check if item is available for external users
  return !(isExternalUser && settings.availableForExternal === false)
}

export function getConfigItemSettings(
  config: readonly ConfigItem[],
  id: string
): ConfigItem['settings'] | null {
  const item: any = getConfigItem(config, id)
  return item?.settings ?? null
}

export const getCredentialType = (name: string): string => {
  const type = name.toLowerCase()
  if (name === 'generic_jira_tool') return 'jira'
  if (name === 'generic_confluence_tool') return 'confluence'
  if (type.includes('xwiki')) return 'xwiki'
  if (type.includes('xray')) return 'xray'
  if (name === 'github' || name === 'gitlab') return 'git'
  if (name === 'azure_devops_git' || type.includes('azure devops')) return 'azuredevops'
  if (name.startsWith('servicenow')) return 'servicenow'
  if (name.startsWith('Report')) return 'reportportal'
  return type
}

export const getSettingsFieldsSectionTitle = (credentialType: string): string => {
  const credConfig = CREDENTIAL_UI_MAPPING[credentialType]
  return credConfig?.fieldsSectionTitle ?? CREDENTIAL_DEFAULTS.fieldsSectionTitle
}

const ALIAS_RANDOM_CHARS_LENGTH = 4
const ALIAS_PREFIX = 'INT'
const ALIAS_SEPARATOR = '-'
const ALIAS_RANDOM_CHARS = 'abcdefghijklmnopqrstuvwxyz0123456789'
const ALIAS_DATE_FORMAT = 'yyyy-MM-dd hh:mm:ss'

const generateRandomSuffix = (length: number): string => {
  const bytes = new Uint8Array(length)
  crypto.getRandomValues(bytes)
  return Array.from(bytes)
    .map((byte) => ALIAS_RANDOM_CHARS[byte % ALIAS_RANDOM_CHARS.length])
    .join('')
}

// Pattern: INT-{identifier}-{4 random chars} - {yyyy-MM-dd hh:mm:ss}, e.g. INT-userId-abcd - 2026-05-12 10:47:31
export const generateDefaultAlias = (identifier: string): string => {
  if (!identifier) return ''
  const randomSuffix = generateRandomSuffix(ALIAS_RANDOM_CHARS_LENGTH)
  const alias = [ALIAS_PREFIX, identifier, randomSuffix].join(ALIAS_SEPARATOR)
  const currentDateTime = formatDate(new Date().toISOString(), ALIAS_DATE_FORMAT)
  return `${alias} - ${currentDateTime}`
}
