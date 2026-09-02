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

import { describe, it, expect, vi, beforeEach } from 'vitest'

const mockGet = vi.fn()

vi.mock('@/utils/api', () => ({
  default: {
    get: (...args: unknown[]) => mockGet(...args),
  },
}))

vi.mock('@/configs/releaseNotes.json', () => ({
  default: [
    {
      version: '2.46.0',
      date: '2026-09-01',
      sections: [
        { code: 'highlights', items: [] },
        { code: 'features', items: [] },
        { code: 'fixes', items: [] },
      ],
    },
    {
      version: '2.45.0',
      date: '2026-08-28',
      sections: [
        { code: 'highlights', items: [] },
        { code: 'features', items: [] },
        { code: 'fixes', items: [] },
      ],
    },
    {
      version: '2.44.0',
      date: '2026-08-19',
      sections: [
        {
          code: 'highlights',
          items: [
            {
              title: 'Highlight item',
              description: 'A highlight.',
              issues: [
                {
                  key: 'EPMCDME-55555',
                  type: 'STORY',
                  link: 'https://jiraeu.epam.com/browse/EPMCDME-55555',
                },
              ],
            },
          ],
        },
        {
          code: 'features',
          items: [],
        },
        {
          code: 'fixes',
          items: [],
        },
      ],
    },
    {
      version: '2.43.0',
      date: '2026-08-01',
      issues: [
        {
          key: 'EPMCDME-11111',
          title: 'Fix A',
          link: 'https://jiraeu.epam.com/browse/EPMCDME-11111',
          type: 'BUG',
        },
        {
          key: 'EPMCDME-22222',
          title: 'New feature',
          link: 'https://jiraeu.epam.com/browse/EPMCDME-22222',
          type: 'STORY',
        },
      ],
    },
  ],
}))

// Import after mock so the store picks up the mocked api
const { appInfoStore, DEFAULT_FILE_DATASOURCE_MAX_UPLOAD_COUNT } = await import('@/store/appInfo')
const { getConfigItemSettings } = await import('@/utils/settings')

const okResponse = (data: unknown) => ({
  json: () => Promise.resolve(data),
})

describe('appInfoStore.loadAppInfo file datasource upload limit', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    appInfoStore.fileDatasourceMaxUploadCount = DEFAULT_FILE_DATASOURCE_MAX_UPLOAD_COUNT
  })

  it('stores a positive integer limit advertised by v1/info', async () => {
    mockGet.mockResolvedValue(
      okResponse({
        message: 'Codemie',
        version: '1.2.3',
        description: 'Test instance',
        fileDatasourceMaxUploadCount: 25,
      })
    )

    await appInfoStore.loadAppInfo()

    expect(appInfoStore.fileDatasourceMaxUploadCount).toBe(25)
  })

  it.each([undefined, '25', 10.5, 0, -1, Number.POSITIVE_INFINITY])(
    'falls back to 10 when v1/info provides %p',
    async (fileDatasourceMaxUploadCount) => {
      mockGet.mockResolvedValue(
        okResponse({
          message: 'Codemie',
          version: '1.2.3',
          description: 'Test instance',
          fileDatasourceMaxUploadCount,
        })
      )

      await appInfoStore.loadAppInfo()

      expect(appInfoStore.fileDatasourceMaxUploadCount).toBe(10)
    }
  )
})

describe('appInfoStore.loadReleaseNotes', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    appInfoStore.appReleases = []
  })

  it('uses deployedAt from endpoint when version matches', async () => {
    mockGet.mockResolvedValue(
      okResponse({ deployments: [{ version: '2.46.0', deployedAt: '2026-09-01T10:00:00Z' }] })
    )

    await appInfoStore.loadReleaseNotes()

    const release = appInfoStore.appReleases.find((r) => r.version === '2.46.0')
    expect(release?.date).toBe('2026-09-01T10:00:00Z')
  })

  it('keeps JSON date as fallback when deployments array is empty', async () => {
    mockGet.mockResolvedValue(okResponse({ deployments: [] }))

    await appInfoStore.loadReleaseNotes()

    const release = appInfoStore.appReleases.find((r) => r.version === '2.46.0')
    expect(release?.date).toBe('2026-09-01')
  })

  it('overrides only versions present in deployments, leaves others unchanged', async () => {
    mockGet.mockResolvedValue(
      okResponse({ deployments: [{ version: '2.46.0', deployedAt: '2026-09-01T10:00:00Z' }] })
    )

    await appInfoStore.loadReleaseNotes()

    const v246 = appInfoStore.appReleases.find((r) => r.version === '2.46.0')
    const v245 = appInfoStore.appReleases.find((r) => r.version === '2.45.0')
    expect(v246?.date).toBe('2026-09-01T10:00:00Z')
    expect(v245?.date).toBe('2026-08-28')
  })

  it('keeps JSON dates on network error (graceful degradation)', async () => {
    mockGet.mockRejectedValue(new Error('network down'))

    await appInfoStore.loadReleaseNotes()

    const release = appInfoStore.appReleases.find((r) => r.version === '2.46.0')
    expect(release?.date).toBe('2026-09-01')
  })
})

describe('appInfoStore.fetchToolConfigs', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    appInfoStore.toolFieldDefaults = {}
    appInfoStore.toolFieldPlaceholders = {}
  })

  it('populates toolFieldDefaults with credType.field keys for standard url fields', async () => {
    mockGet.mockResolvedValue(
      okResponse([
        { jiraconfig: { url: { default: 'https://jira.mycompany.com/' } } },
        { confluenceconfig: { url: { default: 'https://confluence.mycompany.com/' } } },
      ])
    )

    await appInfoStore.fetchToolConfigs()

    expect(appInfoStore.toolFieldDefaults).toEqual({
      'jira.url': 'https://jira.mycompany.com/',
      'confluence.url': 'https://confluence.mycompany.com/',
    })
  })

  it('reads base_url field for keycloak and xray', async () => {
    mockGet.mockResolvedValue(
      okResponse([
        { keycloakconfig: { base_url: { default: 'https://keycloak.mycompany.com' } } },
        { xrayconfig: { base_url: { default: 'https://xray.mycompany.com' } } },
      ])
    )

    await appInfoStore.fetchToolConfigs()

    expect(appInfoStore.toolFieldDefaults['keycloak.base_url']).toBe(
      'https://keycloak.mycompany.com'
    )
    expect(appInfoStore.toolFieldDefaults['xray.base_url']).toBe('https://xray.mycompany.com')
  })

  it('extracts boolean fields: cloud and use_bearer', async () => {
    mockGet.mockResolvedValue(
      okResponse([
        { jiraconfig: { cloud: { default: true } } },
        { confluenceconfig: { cloud: { default: true } } },
        { xwikiconfig: { use_bearer: { default: true } } },
      ])
    )

    await appInfoStore.fetchToolConfigs()

    expect(appInfoStore.toolFieldDefaults['jira.cloud']).toBe(true)
    expect(appInfoStore.toolFieldDefaults['confluence.cloud']).toBe(true)
    expect(appInfoStore.toolFieldDefaults['xwiki.use_bearer']).toBe(true)
  })

  it('stores boolean false as a configured value', async () => {
    mockGet.mockResolvedValue(okResponse([{ jiraconfig: { cloud: { default: false } } }]))

    await appInfoStore.fetchToolConfigs()

    expect(appInfoStore.toolFieldDefaults['jira.cloud']).toBe(false)
  })

  it('extracts string auth_type fields', async () => {
    mockGet.mockResolvedValue(
      okResponse([
        { genericgitconfig: { auth_type: { default: 'pat' } } },
        { emailtoolconfig: { auth_type: { default: 'oauth_azure' } } },
        { genericazuredevopsconfig: { auth_type: { default: 'pat' } } },
      ])
    )

    await appInfoStore.fetchToolConfigs()

    expect(appInfoStore.toolFieldDefaults['git.auth_type']).toBe('pat')
    expect(appInfoStore.toolFieldDefaults['email.auth_type']).toBe('oauth_azure')
    expect(appInfoStore.toolFieldDefaults['azuredevops.auth_type']).toBe('pat')
  })

  it('populates toolFieldPlaceholders with credType.field keys', async () => {
    mockGet.mockResolvedValue(
      okResponse([
        { jiraconfig: { url: { placeholder: 'https://jira.example.com/' } } },
        {
          keycloakconfig: {
            base_url: { placeholder: 'https://keycloak.example.com/auth' },
          },
        },
      ])
    )

    await appInfoStore.fetchToolConfigs()

    expect(appInfoStore.toolFieldPlaceholders['jira.url']).toBe('https://jira.example.com/')
    expect(appInfoStore.toolFieldPlaceholders['keycloak.base_url']).toBe(
      'https://keycloak.example.com/auth'
    )
  })

  it('does not add placeholder entry when field has no placeholder', async () => {
    mockGet.mockResolvedValue(
      okResponse([{ jiraconfig: { url: { default: 'https://jira.mycompany.com/' } } }])
    )

    await appInfoStore.fetchToolConfigs()

    expect(Object.keys(appInfoStore.toolFieldPlaceholders)).toHaveLength(0)
  })

  it('skips fields where default is empty string', async () => {
    mockGet.mockResolvedValue(okResponse([{ jiraconfig: { url: { default: '' } } }]))

    await appInfoStore.fetchToolConfigs()

    expect(appInfoStore.toolFieldDefaults['jira.url']).toBeUndefined()
  })

  it('skips fields where default is null', async () => {
    mockGet.mockResolvedValue(okResponse([{ jiraconfig: { url: { default: null } } }]))

    await appInfoStore.fetchToolConfigs()

    expect(appInfoStore.toolFieldDefaults['jira.url']).toBeUndefined()
  })

  it('skips unknown config class names', async () => {
    mockGet.mockResolvedValue(
      okResponse([
        { unknownconfig: { url: { default: 'https://unknown.example.com' } } },
        { jiraconfig: { url: { default: 'https://jira.mycompany.com/' } } },
      ])
    )

    await appInfoStore.fetchToolConfigs()

    expect(Object.keys(appInfoStore.toolFieldDefaults)).toEqual(['jira.url'])
  })

  it('leaves both stores empty on network error', async () => {
    mockGet.mockRejectedValue(new Error('network down'))

    await appInfoStore.fetchToolConfigs()

    expect(appInfoStore.toolFieldDefaults).toEqual({})
    expect(appInfoStore.toolFieldPlaceholders).toEqual({})
  })

  it('leaves both stores empty when response is not an array', async () => {
    mockGet.mockResolvedValue(okResponse(null))

    await appInfoStore.fetchToolConfigs()

    expect(appInfoStore.toolFieldDefaults).toEqual({})
    expect(appInfoStore.toolFieldPlaceholders).toEqual({})
  })

  it('skips empty entry objects without discarding subsequent valid entries', async () => {
    mockGet.mockResolvedValue(
      okResponse([{}, { jiraconfig: { url: { default: 'https://jira.mycompany.com/' } } }])
    )

    await appInfoStore.fetchToolConfigs()

    expect(appInfoStore.toolFieldDefaults['jira.url']).toBe('https://jira.mycompany.com/')
  })

  it('skips null elements without discarding subsequent valid entries', async () => {
    mockGet.mockResolvedValue(
      okResponse([null, { jiraconfig: { url: { default: 'https://jira.mycompany.com/' } } }])
    )

    await appInfoStore.fetchToolConfigs()

    expect(appInfoStore.toolFieldDefaults['jira.url']).toBe('https://jira.mycompany.com/')
  })

  it('extracts multiple fields from the same config entry', async () => {
    mockGet.mockResolvedValue(
      okResponse([
        {
          jiraconfig: {
            url: {
              default: 'https://jira.mycompany.com/',
              placeholder: 'https://jira.example.com/',
            },
            cloud: { default: true },
          },
        },
      ])
    )

    await appInfoStore.fetchToolConfigs()

    expect(appInfoStore.toolFieldDefaults['jira.url']).toBe('https://jira.mycompany.com/')
    expect(appInfoStore.toolFieldDefaults['jira.cloud']).toBe(true)
    expect(appInfoStore.toolFieldPlaceholders['jira.url']).toBe('https://jira.example.com/')
  })
})

describe('appInfoStore.loadReleaseNotes', () => {
  it('normalizes legacy releases and keeps sectioned releases intact', async () => {
    await appInfoStore.loadReleaseNotes()

    expect(appInfoStore.appReleases).toHaveLength(4)

    const sectionedRelease = appInfoStore.appReleases.find((r) => r.version === '2.44.0')!
    expect(sectionedRelease.sections).toHaveLength(3)
    expect(sectionedRelease.sections[0].items[0].title).toBe('Highlight item')

    const legacyRelease = appInfoStore.appReleases.find((r) => r.version === '2.43.0')!
    expect(legacyRelease.sections).toHaveLength(3)

    const features = legacyRelease.sections.find((section) => section.code === 'features')!
    expect(features.items).toHaveLength(1)
    expect(features.items[0].issues[0].key).toBe('EPMCDME-22222')

    const fixes = legacyRelease.sections.find((section) => section.code === 'fixes')!
    expect(fixes.items).toHaveLength(1)
    expect(fixes.items[0].issues[0].key).toBe('EPMCDME-11111')
  })
})

describe('appInfoStore.getLLMModels', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    appInfoStore.llmModels = []
  })

  it('maps is_premium, cost and capability fields from the API response', async () => {
    mockGet.mockResolvedValue(
      okResponse([
        {
          base_name: 'claude-opus-4-1',
          label: 'Claude Opus 4.1',
          default: false,
          provider: 'anthropic',
          is_premium: true,
          multimodal: true,
          supports_image_generation: false,
          default_for_categories: ['reasoning'],
          cost: { input: 0.000015, output: 0.000075 },
          features: { tools: true },
        },
        {
          base_name: 'gpt-4o',
          label: 'GPT-4o',
          default: true,
          provider: 'azure_openai',
          features: { tools: true },
        },
      ])
    )

    const models = await appInfoStore.getLLMModels()

    expect(models[0]).toEqual({
      value: 'claude-opus-4-1',
      label: 'Claude Opus 4.1',
      isDefault: false,
      provider: 'anthropic',
      isPremium: true,
      multimodal: true,
      supportsImageGeneration: false,
      supportsTools: true,
      defaultForCategories: ['reasoning'],
      cost: { input: 0.000015, output: 0.000075 },
    })
    expect(models[1].isPremium).toBeUndefined()
    expect(models[1].cost).toBeUndefined()
  })
})

describe('appInfoStore customer config refetch', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    appInfoStore.configs = []
    appInfoStore.isConfigFetched = false
  })

  it('serves the cached config on a second fetch', async () => {
    mockGet.mockResolvedValue(
      okResponse([{ id: 'chatDisclaimer', settings: { enabled: true, text: 'hi' } }])
    )

    await appInfoStore.fetchCustomerConfig()
    await appInfoStore.fetchCustomerConfig()

    expect(mockGet).toHaveBeenCalledTimes(1)
  })

  it('refetch bypasses the fetched flag so a saved change is visible without a reload', async () => {
    mockGet.mockResolvedValue(
      okResponse([{ id: 'chatDisclaimer', settings: { enabled: true, text: 'first' } }])
    )
    await appInfoStore.fetchCustomerConfig()

    mockGet.mockResolvedValue(
      okResponse([{ id: 'chatDisclaimer', settings: { enabled: true, text: 'second' } }])
    )
    await appInfoStore.refetchCustomerConfig()

    expect(mockGet).toHaveBeenCalledTimes(2)
    expect(getConfigItemSettings(appInfoStore.configs, 'chatDisclaimer')).toMatchObject({
      enabled: true,
      text: 'second',
    })
  })

  it('reports no disclaimer settings when the component is absent from config', async () => {
    mockGet.mockResolvedValue(okResponse([]))

    await appInfoStore.fetchCustomerConfig()

    expect(getConfigItemSettings(appInfoStore.configs, 'chatDisclaimer')).toBeNull()
  })
})
