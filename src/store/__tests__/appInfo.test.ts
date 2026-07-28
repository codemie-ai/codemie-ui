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

// Import after mock so the store picks up the mocked api
const { appInfoStore } = await import('@/store/appInfo')

const okResponse = (data: unknown) => ({
  json: () => Promise.resolve(data),
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
