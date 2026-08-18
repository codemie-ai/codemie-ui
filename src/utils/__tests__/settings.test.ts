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

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'

import { INDEX_TYPES } from '@/constants/dataSources'
import {
  getAvailableCredentialsTypes,
  getSettingCredsURL,
  getOriginalCredentialType,
  convertCredsToKeyValue,
  getCredentialType,
  generateDefaultAlias,
  SETTING_TYPE_PROJECT,
  SETTING_TYPE_USER,
} from '@/utils/settings'
import { CREDENTIAL_UI_MAPPING } from '@/utils/settingsUIConfig'

vi.mock('@/utils/enterpriseEdition', () => ({
  isEnterpriseEdition: () => true,
}))

const mockToolFieldDefaults: Record<string, string | boolean> = {}
const mockToolFieldPlaceholders: Record<string, string> = {}

vi.mock('@/store/appInfo', () => ({
  appInfoStore: {
    get toolFieldDefaults() {
      return mockToolFieldDefaults
    },
    get toolFieldPlaceholders() {
      return mockToolFieldPlaceholders
    },
  },
}))

// storeField: the backend field name used as the key suffix in toolFieldDefaults.
// urlField: the key inside CREDENTIAL_UI_MAPPING[configKey].fields for the URL input.
// These differ for kubernetes (urlField='kubernetes_url', storeField='url').
const URL_DEFAULTS_CASES: {
  credType: string
  configKey: string
  urlField: string
  storeField: string
}[] = [
  { credType: 'jira', configKey: 'jira', urlField: 'url', storeField: 'url' },
  { credType: 'git', configKey: 'git', urlField: 'url', storeField: 'url' },
  { credType: 'confluence', configKey: 'confluence', urlField: 'url', storeField: 'url' },
  {
    credType: 'kubernetes',
    configKey: 'kubernetes',
    urlField: 'kubernetes_url',
    storeField: 'url',
  },
  { credType: 'keycloak', configKey: 'keycloak', urlField: 'base_url', storeField: 'base_url' },
  { credType: 'azuredevops', configKey: 'azuredevops', urlField: 'url', storeField: 'url' },
  { credType: 'elastic', configKey: 'elastic', urlField: 'url', storeField: 'url' },
  { credType: 'email', configKey: 'email', urlField: 'url', storeField: 'url' },
  { credType: 'sonar', configKey: 'sonar', urlField: 'url', storeField: 'url' },
  { credType: 'zephyrscale', configKey: 'zephyrscale', urlField: 'url', storeField: 'url' },
  { credType: 'xray', configKey: 'xray', urlField: 'base_url', storeField: 'base_url' },
  { credType: 'servicenow', configKey: 'servicenow', urlField: 'url', storeField: 'url' },
  { credType: 'xwiki', configKey: 'xwiki', urlField: 'url', storeField: 'url' },
  { credType: 'sharepoint', configKey: 'sharepoint', urlField: 'url', storeField: 'url' },
  { credType: 'reportportal', configKey: 'reportportal', urlField: 'url', storeField: 'url' },
]

const clearMocks = () => {
  Object.keys(mockToolFieldDefaults).forEach((k) => delete mockToolFieldDefaults[k])
  Object.keys(mockToolFieldPlaceholders).forEach((k) => delete mockToolFieldPlaceholders[k])
}

describe('CREDENTIAL_UI_MAPPING url defaultValue', () => {
  beforeEach(clearMocks)

  it.each(URL_DEFAULTS_CASES)(
    '$credType $urlField: defaultValue is a function',
    ({ configKey, urlField }) => {
      expect(typeof CREDENTIAL_UI_MAPPING[configKey].fields[urlField].defaultValue).toBe('function')
    }
  )

  it.each(URL_DEFAULTS_CASES)(
    '$credType $urlField: defaultValue returns empty string when backend returned nothing',
    ({ configKey, urlField }) => {
      const defaultValue = CREDENTIAL_UI_MAPPING[configKey].fields[urlField]
        .defaultValue as () => string
      expect(defaultValue()).toBe('')
    }
  )

  it.each(URL_DEFAULTS_CASES)(
    '$credType $urlField: defaultValue returns store value when toolFieldDefaults is populated',
    ({ credType, configKey, urlField, storeField }) => {
      mockToolFieldDefaults[`${credType}.${storeField}`] = `https://${credType}.mycompany.com/`
      const defaultValue = CREDENTIAL_UI_MAPPING[configKey].fields[urlField]
        .defaultValue as () => string
      expect(defaultValue()).toBe(`https://${credType}.mycompany.com/`)
    }
  )

  it.each(URL_DEFAULTS_CASES)(
    '$credType $urlField: defaultValue and defaultUrl resolve to the same value',
    ({ credType, configKey, urlField, storeField }) => {
      mockToolFieldDefaults[`${credType}.${storeField}`] = `https://${credType}.mycompany.com/`
      const defaultValue = CREDENTIAL_UI_MAPPING[configKey].fields[urlField]
        .defaultValue as () => string
      const defaultUrl = CREDENTIAL_UI_MAPPING[configKey].defaultUrl as () => string
      expect(defaultValue()).toBe(defaultUrl())
    }
  )
})

describe('CREDENTIAL_UI_MAPPING url placeholder', () => {
  beforeEach(clearMocks)

  it.each(URL_DEFAULTS_CASES)(
    '$credType $urlField: placeholder is a function',
    ({ configKey, urlField }) => {
      expect(typeof CREDENTIAL_UI_MAPPING[configKey].fields[urlField].placeholder).toBe('function')
    }
  )

  it.each(URL_DEFAULTS_CASES)(
    '$credType $urlField: placeholder returns empty string when backend returned nothing',
    ({ configKey, urlField }) => {
      const placeholder = CREDENTIAL_UI_MAPPING[configKey].fields[urlField]
        .placeholder as () => string
      expect(placeholder()).toBe('')
    }
  )

  it.each(URL_DEFAULTS_CASES)(
    '$credType $urlField: placeholder returns store value when toolFieldPlaceholders is populated',
    ({ credType, configKey, urlField, storeField }) => {
      mockToolFieldPlaceholders[`${credType}.${storeField}`] = `https://${credType}.example.com/`
      const placeholder = CREDENTIAL_UI_MAPPING[configKey].fields[urlField]
        .placeholder as () => string
      expect(placeholder()).toBe(`https://${credType}.example.com/`)
    }
  )
})

describe('CREDENTIAL_UI_MAPPING non-url boolean defaults', () => {
  const BOOL_CASES = [
    { credType: 'jira', configKey: 'jira', fieldKey: 'is_cloud', storeField: 'cloud' },
    { credType: 'confluence', configKey: 'confluence', fieldKey: 'is_cloud', storeField: 'cloud' },
    { credType: 'xwiki', configKey: 'xwiki', fieldKey: 'use_bearer', storeField: 'use_bearer' },
  ]

  beforeEach(clearMocks)

  it.each(BOOL_CASES)(
    '$credType $fieldKey: defaultValue is a function',
    ({ configKey, fieldKey }) => {
      expect(typeof CREDENTIAL_UI_MAPPING[configKey].fields[fieldKey].defaultValue).toBe('function')
    }
  )

  it.each(BOOL_CASES)(
    '$credType $fieldKey: defaultValue returns false when backend returned nothing',
    ({ configKey, fieldKey }) => {
      const defaultValue = CREDENTIAL_UI_MAPPING[configKey].fields[fieldKey]
        .defaultValue as () => boolean
      expect(defaultValue()).toBe(false)
    }
  )

  it.each(BOOL_CASES)(
    '$credType $fieldKey: defaultValue returns true when backend configures true',
    ({ credType, configKey, fieldKey, storeField }) => {
      mockToolFieldDefaults[`${credType}.${storeField}`] = true
      const defaultValue = CREDENTIAL_UI_MAPPING[configKey].fields[fieldKey]
        .defaultValue as () => boolean
      expect(defaultValue()).toBe(true)
    }
  )
})

describe('CREDENTIAL_UI_MAPPING non-url string defaults', () => {
  const STRING_CASES = [
    { credType: 'git', configKey: 'git', fieldKey: 'auth_type', fallback: 'pat' },
    { credType: 'email', configKey: 'email', fieldKey: 'auth_type', fallback: 'basic' },
  ]

  beforeEach(clearMocks)

  it.each(STRING_CASES)(
    '$credType $fieldKey: defaultValue is a function',
    ({ configKey, fieldKey }) => {
      expect(typeof CREDENTIAL_UI_MAPPING[configKey].fields[fieldKey].defaultValue).toBe('function')
    }
  )

  it.each(STRING_CASES)(
    '$credType $fieldKey: defaultValue returns fallback when backend returned nothing',
    ({ configKey, fieldKey, fallback }) => {
      const defaultValue = CREDENTIAL_UI_MAPPING[configKey].fields[fieldKey]
        .defaultValue as () => string
      expect(defaultValue()).toBe(fallback)
    }
  )

  it.each(STRING_CASES)(
    '$credType $fieldKey: defaultValue returns configured value from store',
    ({ credType, configKey, fieldKey }) => {
      mockToolFieldDefaults[`${credType}.${fieldKey}`] = 'oauth_azure'
      const defaultValue = CREDENTIAL_UI_MAPPING[configKey].fields[fieldKey]
        .defaultValue as () => string
      expect(defaultValue()).toBe('oauth_azure')
    }
  )
})

describe('getSettingCredsURL', () => {
  beforeEach(clearMocks)

  it('returns stored url value when credential has a url key', () => {
    const credentialValues = [
      { key: 'username', value: 'user' },
      { key: 'url', value: 'http://example.com' },
    ]
    expect(getSettingCredsURL(credentialValues, 'github')).toBe('http://example.com')
  })

  it('returns stored base_url value when credential has a base_url key', () => {
    const credentialValues = [{ key: 'base_url', value: 'https://keycloak.stored.com' }]
    expect(getSettingCredsURL(credentialValues, 'keycloak')).toBe('https://keycloak.stored.com')
  })

  it('returns string defaultUrl when no url or base_url is in the credential values', () => {
    const credentialValues = [{ key: 'username', value: 'user' }]
    expect(getSettingCredsURL(credentialValues, 'github')).toBe('AutoGenerated')
  })

  it('returns empty string for url-type integration when no url stored and backend returned nothing', () => {
    expect(getSettingCredsURL([], 'jira')).toBe('')
  })

  it('returns empty string for keycloak (base_url path) when no url stored and backend returned nothing', () => {
    expect(getSettingCredsURL([], 'keycloak')).toBe('')
  })

  it('returns empty string for xray (base_url path) when no url stored and backend returned nothing', () => {
    expect(getSettingCredsURL([], 'xray')).toBe('')
  })

  it('returns empty string when stored url is empty string and backend returned nothing', () => {
    const credentialValues = [{ key: 'url', value: '' }]
    expect(getSettingCredsURL(credentialValues, 'jira')).toBe('')
  })

  it('resolves function defaultUrl from store when toolFieldDefaults is populated', () => {
    mockToolFieldDefaults['jira.url'] = 'https://jira.mycompany.com/'
    expect(getSettingCredsURL([], 'jira')).toBe('https://jira.mycompany.com/')
  })

  it('resolves keycloak defaultUrl from base_url store key', () => {
    mockToolFieldDefaults['keycloak.base_url'] = 'https://keycloak.mycompany.com'
    expect(getSettingCredsURL([], 'keycloak')).toBe('https://keycloak.mycompany.com')
  })

  it('stored url takes precedence over function defaultUrl', () => {
    mockToolFieldDefaults['jira.url'] = 'https://jira.mycompany.com/'
    const credentialValues = [{ key: 'url', value: 'https://jira.stored.com/' }]
    expect(getSettingCredsURL(credentialValues, 'jira')).toBe('https://jira.stored.com/')
  })

  it('stored base_url takes precedence over function defaultUrl for keycloak', () => {
    mockToolFieldDefaults['keycloak.base_url'] = 'https://keycloak.mycompany.com'
    const credentialValues = [{ key: 'base_url', value: 'https://keycloak.stored.com' }]
    expect(getSettingCredsURL(credentialValues, 'keycloak')).toBe('https://keycloak.stored.com')
  })
})

describe('getOriginalCredentialType', () => {
  it('returns uppercase for special credential types', () => {
    expect(getOriginalCredentialType('aws')).toBe('AWS')
    expect(getOriginalCredentialType('gcp')).toBe('GCP')
  })

  it('returns capitalized for non-special credential types', () => {
    expect(getOriginalCredentialType('github')).toBe('Github')
  })
})

describe('convertCredsToKeyValue', () => {
  it('converts object to key-value array', () => {
    const input = { username: 'user', password: 'pass' }
    const expected = [
      { key: 'username', value: 'user' },
      { key: 'password', value: 'pass' },
    ]
    expect(convertCredsToKeyValue(input)).toEqual(expected)
  })

  it('returns empty array for null input', () => {
    expect(convertCredsToKeyValue(undefined)).toEqual([])
  })

  it('preserves existing key-value structure', () => {
    const input = {
      username: { key: 'username', value: 'user' },
      password: 'pass',
    }
    const expected = [
      { key: 'username', value: 'user' },
      { key: 'password', value: 'pass' },
    ]
    expect(convertCredsToKeyValue(input as any)).toEqual(expected)
  })
})

describe('getCredentialType', () => {
  it('returns jira for generic_jira_tool', () => {
    expect(getCredentialType('generic_jira_tool')).toBe('jira')
  })

  it('returns confluence for generic_confluence_tool', () => {
    expect(getCredentialType('generic_confluence_tool')).toBe('confluence')
  })

  it('returns xwiki for tools starting with xwiki', () => {
    expect(getCredentialType('xwiki_list_wikis')).toBe('xwiki')
    expect(getCredentialType('xwiki_get_page')).toBe('xwiki')
  })

  it('returns xray for tools containing xray (case-insensitive)', () => {
    expect(getCredentialType('xray_test_tool')).toBe('xray')
    expect(getCredentialType('generic_xray_tool')).toBe('xray')
    expect(getCredentialType('XRAY')).toBe('xray')
    expect(getCredentialType('Xray_Integration')).toBe('xray')
  })

  it('returns git for github and gitlab', () => {
    expect(getCredentialType('github')).toBe('git')
    expect(getCredentialType('gitlab')).toBe('git')
  })

  it('returns azuredevops for azure_devops_git', () => {
    expect(getCredentialType('azure_devops_git')).toBe('azuredevops')
  })

  it('returns servicenow for tools starting with servicenow', () => {
    expect(getCredentialType('servicenow_tool')).toBe('servicenow')
  })

  it('returns reportportal for tools starting with Report', () => {
    expect(getCredentialType('ReportPortal')).toBe('reportportal')
  })

  it('returns sharepoint for tools containing sharepoint', () => {
    expect(getCredentialType('sharepoint_site')).toBe('sharepoint')
    expect(getCredentialType('SharePoint')).toBe('sharepoint')
  })

  it('returns lowercase type for unrecognized tools', () => {
    expect(getCredentialType('CustomTool')).toBe('customtool')
  })
})

describe('getAvailableCredentialsTypes LiteLLM filtering', () => {
  const regularUser = {
    isAdmin: false,
    applicationsAdmin: [],
    applications: ['demo'],
  } as any

  const adminUser = {
    isAdmin: true,
    applicationsAdmin: [],
    applications: ['demo'],
  } as any

  const enabledConfig = [
    { id: 'features:personalLiteLLMIntegrations', settings: { enabled: true } },
  ]

  const disabledConfig = [
    { id: 'features:personalLiteLLMIntegrations', settings: { enabled: false } },
  ]

  it('hides LiteLLM from regular user settings when personal feature is disabled', () => {
    expect(
      getAvailableCredentialsTypes({
        settingType: SETTING_TYPE_USER,
        user: regularUser,
        project: 'demo',
        customerConfig: disabledConfig,
      })
    ).not.toContain('litellm')
  })

  it('shows LiteLLM in regular user settings when personal feature is enabled', () => {
    expect(
      getAvailableCredentialsTypes({
        settingType: SETTING_TYPE_USER,
        user: regularUser,
        project: 'demo',
        customerConfig: enabledConfig,
      })
    ).toContain('litellm')
  })

  it('keeps LiteLLM hidden from regular project settings when personal feature is enabled', () => {
    expect(
      getAvailableCredentialsTypes({
        settingType: SETTING_TYPE_PROJECT,
        user: regularUser,
        project: 'demo',
        customerConfig: enabledConfig,
      })
    ).not.toContain('litellm')
  })

  it('keeps LiteLLM visible for admins when personal feature is disabled', () => {
    expect(
      getAvailableCredentialsTypes({
        settingType: SETTING_TYPE_USER,
        user: adminUser,
        project: 'demo',
        customerConfig: disabledConfig,
      })
    ).toContain('litellm')
  })

  it('hides personal LiteLLM while customer config is not loaded', () => {
    expect(
      getAvailableCredentialsTypes({
        settingType: SETTING_TYPE_USER,
        user: regularUser,
        project: 'demo',
      })
    ).not.toContain('litellm')
  })
})

describe('generateDefaultAlias', () => {
  beforeEach(() => {
    vi.useFakeTimers()
    vi.setSystemTime(new Date('2026-05-31T16:45:00'))
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  it('builds alias as {type}-{YYYY-MM-DD_HH-MM}', () => {
    expect(generateDefaultAlias('jira')).toBe('jira-2026-05-31_16-45')
  })

  it('lowercases the type and collapses non-alphanumeric runs to a single dash', () => {
    expect(generateDefaultAlias('GitHub Cloud')).toBe('github-cloud-2026-05-31_16-45')
  })

  it('trims leading and trailing dashes from the type', () => {
    expect(generateDefaultAlias('--jira--')).toBe('jira-2026-05-31_16-45')
  })

  it('returns empty string when type is missing', () => {
    expect(generateDefaultAlias('')).toBe('')
  })

  it('returns empty string when slugified type becomes empty', () => {
    expect(generateDefaultAlias('@@@')).toBe('')
  })

  it('reflects the current datetime in the suffix', () => {
    vi.setSystemTime(new Date('2027-01-09T08:08:00'))
    expect(generateDefaultAlias('git')).toBe('git-2027-01-09_08-08')
  })

  it('converts underscores in INDEX_TYPES.AZURE_DEVOPS_WIKI to dashes', () => {
    expect(generateDefaultAlias(INDEX_TYPES.AZURE_DEVOPS_WIKI)).toBe(
      'azure-devops-wiki-2026-05-31_16-45'
    )
  })

  it('converts underscores in INDEX_TYPES.AZURE_DEVOPS_WORK_ITEM to dashes', () => {
    expect(generateDefaultAlias(INDEX_TYPES.AZURE_DEVOPS_WORK_ITEM)).toBe(
      'azure-devops-work-item-2026-05-31_16-45'
    )
  })

  it('passes through simple INDEX_TYPES values unchanged', () => {
    expect(generateDefaultAlias(INDEX_TYPES.CONFLUENCE)).toBe('confluence-2026-05-31_16-45')
    expect(generateDefaultAlias(INDEX_TYPES.SHAREPOINT)).toBe('sharepoint-2026-05-31_16-45')
    expect(generateDefaultAlias(INDEX_TYPES.FILE)).toBe('file-2026-05-31_16-45')
  })
})
