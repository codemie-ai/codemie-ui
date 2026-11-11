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

import { render } from '@testing-library/react'
import { RouteObject } from 'react-router'
import { describe, it, expect, beforeEach } from 'vitest'

import { FEATURE_FLAGS } from '@/constants/featureFlags'
import { routes } from '@/router'
import { appInfoStore } from '@/store/appInfo'

const flatten = (list: RouteObject[]): RouteObject[] =>
  list.flatMap((r) => [r, ...(r.children ? flatten(r.children) : [])])

const guard = () =>
  flatten(routes).find((r) => !r.path && r.children?.some((c) => c.id === 'katas'))!

const setFlag = (enabled: boolean | null) => {
  appInfoStore.configs = (
    enabled === null ? [] : [{ id: FEATURE_FLAGS.KATAS, settings: { enabled } }]
  ) as typeof appInfoStore.configs
  appInfoStore.isConfigFetched = true
}

describe('katas route gating', () => {
  beforeEach(() => setFlag(null))

  it('guards all seven kata routes', () => {
    expect(guard().children?.map((c) => c.id)).toEqual([
      'katas',
      'new-kata',
      'edit-kata',
      'katas-in-progress',
      'katas-completed',
      'katas-leaderboard',
      'kata-detail',
    ])
  })

  it.each([null, false])('throws a 404 when the config is %s', (value) => {
    setFlag(value)
    expect(() => render(<>{guard().element}</>)).toThrow(
      expect.objectContaining({ message: 'Not Found', status: 404 })
    )
  })

  it('renders when enabled', () => {
    setFlag(true)
    expect(() => render(<>{guard().element}</>)).not.toThrow()
  })
})
