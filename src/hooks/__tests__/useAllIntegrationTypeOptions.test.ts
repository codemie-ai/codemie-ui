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
import { describe, it, expect } from 'vitest'

import { useAllIntegrationTypeOptions } from '../useAllIntegrationTypeOptions'

describe('useAllIntegrationTypeOptions', () => {
  it('returns non-empty options from CREDENTIAL_UI_MAPPING', () => {
    const { result } = renderHook(() => useAllIntegrationTypeOptions())
    expect(result.current.length).toBeGreaterThan(0)
  })

  it('includes AzureDevOps option with correct value', () => {
    const { result } = renderHook(() => useAllIntegrationTypeOptions())
    const azureOption = result.current.find((opt) => opt.value === 'AzureDevOps')
    expect(azureOption).toBeDefined()
  })

  it('includes Jira option with correct value', () => {
    const { result } = renderHook(() => useAllIntegrationTypeOptions())
    const jiraOption = result.current.find((opt) => opt.value === 'Jira')
    expect(jiraOption).toBeDefined()
  })

  it('returns options sorted alphabetically by label', () => {
    const { result } = renderHook(() => useAllIntegrationTypeOptions())
    const labels = result.current.map((opt) => opt.label)
    const sorted = [...labels].sort((a, b) => a.localeCompare(b))
    expect(labels).toEqual(sorted)
  })

  it('each option has both label and value', () => {
    const { result } = renderHook(() => useAllIntegrationTypeOptions())
    result.current.forEach((opt) => {
      expect(opt.label).toBeTruthy()
      expect(opt.value).toBeTruthy()
    })
  })

  it('excludes types the backend cannot resolve to a tool', () => {
    const { result } = renderHook(() => useAllIntegrationTypeOptions())
    const values = result.current.map((opt) => opt.value)
    ;[
      'A2A',
      'LiteLLM',
      'SVN',
      'FileSystem',
      'MCP',
      'Scheduler',
      'DIAL',
      'Webhook',
      'GoogleOAuth',
    ].forEach((v) => expect(values).not.toContain(v))
  })

  it('has unique values (OAuth variants collapse into their base type)', () => {
    const { result } = renderHook(() => useAllIntegrationTypeOptions())
    const values = result.current.map((opt) => opt.value)
    expect(new Set(values).size).toBe(values.length)
  })
})
