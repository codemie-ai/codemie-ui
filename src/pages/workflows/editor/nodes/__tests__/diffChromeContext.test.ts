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

import { afterEach, describe, expect, it, vi } from 'vitest'

import { getTailwindColor } from '@/utils/tailwindColors'

import { DIFF_CSS_VAR, getDiffColor } from '../diffChromeContext'

vi.mock('@/utils/tailwindColors', () => ({
  getTailwindColor: vi.fn((property: string) => `resolved:${property}`),
}))

const STATUSES = ['added', 'removed', 'modified'] as const

const EXPECTED_CSS_VAR = {
  added: '--colors-success-primary',
  removed: '--colors-failed-secondary',
  modified: '--colors-aborted-primary',
} as const

afterEach(() => {
  vi.mocked(getTailwindColor).mockClear()
})

describe('getDiffColor', () => {
  it.each(STATUSES)(
    'resolves %s through DIFF_CSS_VAR via getTailwindColor with the border-primary fallback chain',
    (status) => {
      const color = getDiffColor(status)

      expect(DIFF_CSS_VAR[status]).toBe(EXPECTED_CSS_VAR[status])
      expect(getTailwindColor).toHaveBeenCalledWith('--colors-border-primary', 'gray')
      expect(getTailwindColor).toHaveBeenCalledWith(
        EXPECTED_CSS_VAR[status],
        'resolved:--colors-border-primary'
      )
      expect(color).toBe(`resolved:${EXPECTED_CSS_VAR[status]}`)
    }
  )
})
