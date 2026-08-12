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

import { render, screen } from '@testing-library/react'
import { describe, it, expect, vi } from 'vitest'

import { dataSourceNameId } from '@/utils/ariaIds'

import DataSourceActions from '../DataSourceActions'

vi.mock('@/assets/icons/navigation-more.svg?react', () => ({ default: () => <span /> }))
vi.mock('@/assets/icons/delete.svg?react', () => ({ default: () => <span /> }))
vi.mock('@/assets/icons/edit.svg?react', () => ({ default: () => <span /> }))
vi.mock('@/assets/icons/info.svg?react', () => ({ default: () => <span /> }))
vi.mock('@/assets/icons/copy.svg?react', () => ({ default: () => <span /> }))
vi.mock('@/assets/icons/copy-link.svg?react', () => ({ default: () => <span /> }))
vi.mock('@/components/ConfirmationModal', () => ({ default: () => null }))
vi.mock('@/hooks/useVueRouter', () => ({ useVueRouter: () => ({ push: vi.fn() }) }))
vi.mock('valtio', async (orig) => {
  const actual = await orig<typeof import('valtio')>()
  return {
    ...actual,
    useSnapshot: (store: any) => store,
  }
})
vi.mock('@/store/dataSources', () => ({ dataSourceStore: {} }))
vi.mock('@/store', () => ({ userStore: { user: { isAdmin: false } } }))
vi.mock('@/utils/utils', async (orig) => ({ ...(await orig<object>()), copyToClipboard: vi.fn() }))
vi.mock('../DataSourceDeleteModal', () => ({ default: () => null }))

const makeItem = (overrides: Record<string, unknown> = {}) => ({
  id: 'ds-1',
  repo_name: 'my-repo',
  full_name: 'org/my-repo',
  index_type: 'git',
  status: 'indexed',
  ...overrides,
})

describe('DataSourceActions accessibility (contextId pattern)', () => {
  it('More Options button references the datasource name element via aria-labelledby', () => {
    render(
      <div>
        <span id={dataSourceNameId('ds-1')}>my-repo</span>
        <DataSourceActions item={makeItem() as any} />
      </div>
    )
    const btn = screen.getByRole('button', { name: 'More options my-repo' })
    expect(btn).toBeInTheDocument()
    expect(btn).not.toHaveAttribute('aria-label')
    const parts = btn.getAttribute('aria-labelledby')!.split(/\s+/)
    expect(document.getElementById(parts[1])).toHaveTextContent('my-repo')
  })
})
