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

import { describe, it, expect } from 'vitest'

import { FEATURE_FLAGS } from '@/constants/featureFlags'
import {
  isFoldedOAuth,
  OAUTH_VARIANT_FEATURE_FLAG,
  resolveOAuthVariant,
} from '@/constants/integration'

describe('OAUTH_VARIANT_FEATURE_FLAG', () => {
  it('maps each OAuth variant to its provider feature flag', () => {
    expect(OAUTH_VARIANT_FEATURE_FLAG.gitlaboauth).toBe(FEATURE_FLAGS.GITLAB_OAUTH)
    expect(OAUTH_VARIANT_FEATURE_FLAG.jiraoauth).toBe(FEATURE_FLAGS.JIRA_OAUTH)
    expect(OAUTH_VARIANT_FEATURE_FLAG.confluenceoauth).toBe(FEATURE_FLAGS.CONFLUENCE_OAUTH)
  })
})

describe('isFoldedOAuth', () => {
  it('is true only when auth_type is oauth', () => {
    expect(isFoldedOAuth({ auth_type: 'oauth' })).toBe(true)
    expect(isFoldedOAuth({ auth_type: 'pat' })).toBe(false)
    expect(isFoldedOAuth({})).toBe(false)
    expect(isFoldedOAuth(undefined)).toBe(false)
  })
})

describe('resolveOAuthVariant', () => {
  it('returns the variant key directly for a variant credentialType', () => {
    expect(resolveOAuthVariant('gitlaboauth', {})).toBe('gitlaboauth')
    expect(resolveOAuthVariant('jiraoauth', undefined)).toBe('jiraoauth')
    expect(resolveOAuthVariant('confluenceoauth', {})).toBe('confluenceoauth')
  })

  it('maps a base type + oauth marker to its variant', () => {
    expect(resolveOAuthVariant('git', { auth_type: 'oauth' })).toBe('gitlaboauth')
    expect(resolveOAuthVariant('jira', { auth_type: 'oauth' })).toBe('jiraoauth')
    expect(resolveOAuthVariant('confluence', { auth_type: 'oauth' })).toBe('confluenceoauth')
  })

  it('is case-insensitive on the credentialType', () => {
    expect(resolveOAuthVariant('Jira', { auth_type: 'oauth' })).toBe('jiraoauth')
    expect(resolveOAuthVariant('Git', { auth_type: 'oauth' })).toBe('gitlaboauth')
  })

  it('returns undefined for a base type without the marker (PAT)', () => {
    expect(resolveOAuthVariant('jira', { token: 'x' })).toBeUndefined()
    expect(resolveOAuthVariant('git', {})).toBeUndefined()
  })

  it('returns undefined for a non-OAuth type', () => {
    expect(resolveOAuthVariant('aws', { auth_type: 'oauth' })).toBeUndefined()
  })
})
