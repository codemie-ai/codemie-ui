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

import { act, renderHook } from '@testing-library/react'
import { afterEach, describe, it, expect, vi } from 'vitest'

import { INDEX_TYPES } from '@/constants/dataSources'
import { DEFAULT_FILE_DATASOURCE_MAX_UPLOAD_COUNT, appInfoStore } from '@/store/appInfo'
import { getBrowserTimezone } from '@/utils/timezone'

import { useEditPopupForm } from '../useEditPopupForm'

// Prevent the dataSources store (772 lines + transitive API/type imports) from loading.
vi.mock('@/store/dataSources', () => ({
  dataSourceStore: { indexProviderSchemas: [] },
}))

// Prevent @/utils/helpers → @/router → all page components from loading.
vi.mock('@/utils/helpers', () => ({
  humanize: (s: string) => s,
}))

vi.mock('@/utils/indexing', () => ({
  getIndexTypeCode: vi.fn(() => 'git'),
  fileSizeValidator: vi.fn(() => true),
  googleDocLinkValidator: vi.fn(() => true),
}))

// Prevent GuardrailAssignmentPanel's deep component tree from loading.
vi.mock(
  '@/components/guardrails/GuardrailAssignmentPanel/schemas/guardrailAssignmentSchema',
  () => ({ guardrailAssignmentsSchema: {} })
)

vi.mock('@/hooks/useSearchParams', () => ({
  useSearchParams: () => [new URLSearchParams(), vi.fn()],
}))

vi.mock('@/utils/timezone', () => ({
  getBrowserTimezone: vi.fn(() => 'America/New_York'),
  getIANATimezoneOptions: vi.fn(() => []),
}))

afterEach(() => {
  appInfoStore.fileDatasourceMaxUploadCount = DEFAULT_FILE_DATASOURCE_MAX_UPLOAD_COUNT
})

describe('useEditPopupForm — timezone default values', () => {
  it('create form: timezone defaults to getBrowserTimezone()', () => {
    const { result } = renderHook(() => useEditPopupForm({}, false))
    expect(result.current.getValues('timezone')).toBe('America/New_York')
  })

  it('edit form: timezone uses the stored value when defaults.timezone is set', () => {
    // Stable reference — avoids infinite re-render loop from useEffect([defaults])
    const defaults = { id: '1', timezone: 'Europe/Warsaw' } as any
    const { result } = renderHook(() => useEditPopupForm(defaults, true))
    expect(getBrowserTimezone()).toBe('America/New_York')
    expect(result.current.getValues('timezone')).toBe('Europe/Warsaw')
  })

  it('edit form: timezone falls back to getBrowserTimezone() when defaults.timezone is absent', () => {
    const defaults = { id: '1', timezone: undefined } as any
    const { result } = renderHook(() => useEditPopupForm(defaults, true))
    expect(result.current.getValues('timezone')).toBe('America/New_York')
  })

  it('edit form: timezone falls back to getBrowserTimezone() when defaults.timezone is null', () => {
    const defaults = { id: '1', timezone: null } as any
    const { result } = renderHook(() => useEditPopupForm(defaults, true))
    expect(result.current.getValues('timezone')).toBe('America/New_York')
  })
})

describe('useEditPopupForm — configurable File Datasource limit', () => {
  it('accepts eleven files when the backend advertises a limit of twelve', async () => {
    appInfoStore.fileDatasourceMaxUploadCount = 12
    const { result } = renderHook(() => useEditPopupForm({}, false))
    const files = Array.from(
      { length: 11 },
      (_, index) => new File(['content'], `file-${index}.txt`, { type: 'text/plain' })
    )

    act(() => {
      result.current.setValue('indexType', INDEX_TYPES.FILE)
      result.current.setValue('files', files)
    })

    await expect(result.current.trigger('files')).resolves.toBe(true)
  })

  it('rejects thirteen files when the backend advertises a limit of twelve', async () => {
    appInfoStore.fileDatasourceMaxUploadCount = 12
    const { result } = renderHook(() => useEditPopupForm({}, false))
    const files = Array.from(
      { length: 13 },
      (_, index) => new File(['content'], `file-${index}.txt`, { type: 'text/plain' })
    )

    act(() => {
      result.current.setValue('indexType', INDEX_TYPES.FILE)
      result.current.setValue('files', files)
    })

    await expect(result.current.trigger('files')).resolves.toBe(false)
  })
})
