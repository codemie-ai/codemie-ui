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

import { describe, expect, it, vi } from 'vitest'

import { router } from '../useVueRouter'

vi.unmock('@/hooks/useVueRouter')

vi.mock('@/router', () => ({ router: { routes: [], state: { matches: [] }, navigate: vi.fn() } }))
vi.mock('@/utils/helpers', () => ({ getRootPath: () => '' }))

describe('legacy route parameter normalization', () => {
  it.each([
    [42, '/apps/42'],
    [false, '/apps/false'],
    [['one', 'two'], '/apps/one%2Ctwo'],
    [null, '/apps'],
    [undefined, '/apps'],
  ])('resolves %j without losing its value or optional semantics', (id, expected) => {
    expect(router.resolve({ path: '/apps/:id?', params: { id } }).path).toBe(expected)
  })

  it('encodes route delimiters rather than letting a parameter change the destination path', () => {
    expect(router.resolve({ path: '/apps/:id', params: { id: 'one/two?admin=true' } }).path).toBe(
      '/apps/one%2Ftwo%3Fadmin%3Dtrue'
    )
  })
})
