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
import { describe, it, expect, vi, beforeEach } from 'vitest'

import DataSourcesPage from '../DataSourcesPage'

// Mock all dependencies
vi.mock('valtio', async (orig) => {
  const actual = await orig<typeof import('valtio')>()
  return {
    ...actual,
    useSnapshot: (store: any) => store,
  }
})

vi.mock('@/store/dataSources', () => ({
  dataSourceStore: {
    indexStatuses: [],
    indexStatusesPagination: { page: 0, perPage: 10, total: 0 },
    getIndexesStatuses: vi.fn(),
    loading: false,
  },
}))

vi.mock('@/store/appInfo', () => ({
  appInfoStore: {
    getLLMModels: vi.fn(),
    getEmbeddingsModels: vi.fn(),
  },
}))

vi.mock('@/hooks/useAbortController', () => ({
  useAbortController: () => ({ execute: vi.fn((fn) => fn()) }),
}))

vi.mock('@/hooks/useTableFilters', () => ({
  useTableFilters: () => ({
    sort: { sortKey: '', sortOrder: '' },
    onSort: vi.fn(),
    onPaginationUpdate: vi.fn(),
    pagination: { page: 0, perPage: 10 },
    applyFilters: vi.fn(),
  }),
}))

vi.mock('@/hooks/useVueRouter', () => ({
  useVueRouter: () => ({ push: vi.fn() }),
}))

vi.mock('@/pages/dataSources/components', () => ({
  DataSourceActions: () => null,
  DataSourceFilters: () => null,
  DataSourceStatus: () => null,
}))

vi.mock('@/pages/dataSources/components/DataSourceName', () => ({
  default: () => null,
}))

vi.mock('@/components/Button', () => ({
  default: () => null,
}))

vi.mock('@/components/Layouts/Layout', () => ({
  default: ({ children }: any) => <div>{children}</div>,
}))

vi.mock('@/components/Sidebar', () => ({
  default: ({ children }: any) => <div>{children}</div>,
}))

vi.mock('@/components/Table', () => ({
  default: () => null,
}))

vi.mock('@/components/Tooltip', () => ({
  default: () => null,
}))

vi.mock('@/utils/filters', () => ({
  FILTER_ENTITY: { DATASOURCES: 'datasources' },
  getFilters: () => ({}),
}))

vi.mock('@/utils/helpers', () => ({
  humanize: (v: string) => v,
}))

vi.mock('@/utils/indexing', () => ({
  getIndexTypeDisplay: (v: string) => v,
  visibility: (v: boolean) => (v ? 'yes' : 'no'),
}))

describe('DataSourcesPage - Announcement Integration', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('renders Announcement component with aria-live region', () => {
    render(<DataSourcesPage />)

    // The Announcement component renders an output element with aria-live="polite"
    const output = document.querySelector('output[aria-live="polite"]')
    expect(output).toBeInTheDocument()
    expect(output).toHaveAttribute('aria-atomic', 'true')
  })
})
