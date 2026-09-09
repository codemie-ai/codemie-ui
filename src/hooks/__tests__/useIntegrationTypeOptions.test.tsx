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
import { describe, it, expect, vi } from 'vitest'

import { useIntegrationTypeOptions } from '@/hooks/useIntegrationTypeOptions'

vi.mock('@/utils/settings', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@/utils/settings')>()
  return {
    ...actual,
    // Base types plus their folded OAuth variants; the hook must drop the variants.
    getCredentialUIMapping: vi.fn().mockReturnValue({
      jira: {},
      jiraoauth: {},
      confluence: {},
      confluenceoauth: {},
      git: {},
      gitlaboauth: {},
    }),
  }
})

describe('useIntegrationTypeOptions — OAuth variants fold into base type', () => {
  it('excludes jiraoauth/confluenceoauth/gitlaboauth so no duplicate filter option is emitted', () => {
    const { result } = renderHook(() =>
      useIntegrationTypeOptions({ settingType: 'user', user: null })
    )

    const values = result.current.map((o) => o.value)
    // Base serverEnums present exactly once; OAuth variants contributed none of their own.
    expect(values.filter((v) => v === 'Jira')).toHaveLength(1)
    expect(values.filter((v) => v === 'Confluence')).toHaveLength(1)
    expect(values.filter((v) => v === 'Git')).toHaveLength(1)
    expect(result.current).toHaveLength(3)
  })
})
