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

import { renderHook } from '@testing-library/react'
import { describe, it, expect, beforeEach, vi } from 'vitest'

import { FEATURE_FLAGS } from '@/constants/featureFlags'
import { OAUTH_VARIANT_BY_BASE_TYPE } from '@/constants/integration'
import { useIntegrationTypeOptions } from '@/hooks/useIntegrationTypeOptions'
import { userStore } from '@/store'
import { appInfoStore } from '@/store/appInfo'
import { User } from '@/types/entity/user'
import { IntegrationScope } from '@/utils/integrationScope'
import {
  getCredentialUIMapping,
  getOriginalCredentialType,
  getTypeScopeBinding,
} from '@/utils/settings'

vi.mock('@/utils/settings', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@/utils/settings')>()
  return { ...actual, getCredentialUIMapping: vi.fn(actual.getCredentialUIMapping) }
})

const setUser = (over: Partial<User>) => {
  userStore.user = { isAdmin: false, applicationsAdmin: [], ...over } as User
}

const find = (options: { value: unknown }[], value: string) =>
  options.find((o) => o.value === value) as
    | { value: string; badge?: string; hint?: string; disabled?: boolean }
    | undefined

describe('getTypeScopeBinding', () => {
  it('maps serverEnum of a PROJECT_ONLY type to project', () => {
    expect(getTypeScopeBinding('DIAL')).toBe('project')
  })

  it('maps serverEnum of a USER_ONLY type to user', () => {
    expect(getTypeScopeBinding('GoogleOAuth')).toBe('user')
  })

  it('returns null for ALL types and unknown types', () => {
    expect(getTypeScopeBinding('Jira')).toBeNull()
    expect(getTypeScopeBinding('NoSuchType')).toBeNull()
  })
})

describe('useIntegrationTypeOptions', () => {
  beforeEach(async () => {
    setUser({})
    // Google OAuth, the User-only type used below, is listed only while its feature flag is on.
    appInfoStore.configs = [{ id: FEATURE_FLAGS.GOOGLE_OAUTH, settings: { enabled: true } }]
    const actual = await vi.importActual<typeof import('@/utils/settings')>('@/utils/settings')
    vi.mocked(getCredentialUIMapping).mockImplementation(actual.getCredentialUIMapping)
  })

  it('leaves Google OAuth out while its feature flag is off', () => {
    appInfoStore.configs = []
    const { result } = renderHook(() => useIntegrationTypeOptions('all'))
    expect(find(result.current.options, 'GoogleOAuth')).toBeUndefined()
    expect(result.current.boundTypes.GoogleOAuth).toBeUndefined()
  })

  it('gives a member no Project-only types', () => {
    const { result } = renderHook(() => useIntegrationTypeOptions(IntegrationScope.USER))
    expect(find(result.current.options, 'DIAL')).toBeUndefined()
    expect(result.current.boundTypes.DIAL).toBeUndefined()
    expect(find(result.current.options, 'GoogleOAuth')?.badge).toBe('User only')
  })

  it('tags bound types and disables the other scope at Scope user for a project admin', () => {
    setUser({ applicationsAdmin: ['p1'] })
    const { result } = renderHook(() => useIntegrationTypeOptions(IntegrationScope.USER))
    expect(find(result.current.options, 'DIAL')).toMatchObject({
      badge: 'Project only',
      disabled: true,
      hint: 'Not available at User scope',
    })
    const google = find(result.current.options, 'GoogleOAuth')
    expect(google?.badge).toBe('User only')
    expect(google?.disabled).toBeFalsy()
    expect(result.current.boundTypes.DIAL).toEqual({ scope: 'project', label: 'DIAL' })
  })

  it('disables User-only types at Scope project', () => {
    setUser({ applicationsAdmin: ['p1'] })
    const { result } = renderHook(() => useIntegrationTypeOptions(IntegrationScope.PROJECT))
    expect(find(result.current.options, 'GoogleOAuth')).toMatchObject({
      disabled: true,
      hint: 'Not available at Project scope',
    })
    expect(find(result.current.options, 'DIAL')?.disabled).toBeFalsy()
  })

  it('disables nothing at Scope all', () => {
    setUser({ applicationsAdmin: ['p1'] })
    const { result } = renderHook(() => useIntegrationTypeOptions('all'))
    expect(result.current.options.some((o) => o.disabled)).toBe(false)
    expect(find(result.current.options, 'DIAL')?.badge).toBe('Project only')
  })

  it('folds OAuth variants into their base type (no duplicate values)', async () => {
    setUser({ applicationsAdmin: ['p1'] })
    const { CREDENTIAL_UI_MAPPING } = await import('@/utils/settingsUIConfig')
    const pairs = Object.entries(OAUTH_VARIANT_BY_BASE_TYPE)
    // A mapping that surely lists every base type next to its OAuth variant.
    const mapping = Object.fromEntries(
      pairs.flatMap(([base, variant]) => [
        [base, CREDENTIAL_UI_MAPPING[base] ?? {}],
        [variant, CREDENTIAL_UI_MAPPING[variant] ?? {}],
      ])
    )
    vi.mocked(getCredentialUIMapping).mockReturnValue(mapping as any)

    const { result } = renderHook(() => useIntegrationTypeOptions('all'))
    const values = result.current.options.map((o) => o.value)

    expect(pairs.length).toBeGreaterThan(0)
    pairs.forEach(([base, variant]) => {
      // Precondition: the variant shares its base type's value, so listing it would duplicate it.
      expect(getOriginalCredentialType(variant)).toBe(getOriginalCredentialType(base))
      expect(values.filter((v) => v === getOriginalCredentialType(base))).toHaveLength(1)
    })
    expect(values).toHaveLength(pairs.length)
    expect(new Set(values).size).toBe(values.length)
  })
})
