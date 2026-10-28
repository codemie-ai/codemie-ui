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

import { renderHook, act, waitFor } from '@testing-library/react'
import { FC, ReactNode } from 'react'
import { MemoryRouter } from 'react-router'
import { describe, it, expect } from 'vitest'

import { useAssistantsFilters } from '../useAssistantsFilters'

const wrapperFor = (initialUrl: string): FC<{ children: ReactNode }> =>
  function Wrapper({ children }) {
    return <MemoryRouter initialEntries={[initialUrl]}>{children}</MemoryRouter>
  }

const renderAt = (url: string) =>
  renderHook(() => useAssistantsFilters(), { wrapper: wrapperFor(url) })

describe('useAssistantsFilters', () => {
  it('filters.status defaults to ALL when no URL param is present', async () => {
    const { result } = renderAt('/assistants')

    await waitFor(() => {
      expect(result.current.filters.status).toBe('ALL')
    })
  })

  it('hydrates a valid ?status=PENDING from the URL', async () => {
    const { result } = renderAt('/assistants?status=PENDING')

    await waitFor(() => {
      expect(result.current.filters.status).toBe('PENDING')
    })
  })

  it('hydrates a valid ?status=VERIFIED from the URL', async () => {
    const { result } = renderAt('/assistants?status=VERIFIED')

    await waitFor(() => {
      expect(result.current.filters.status).toBe('VERIFIED')
    })
  })

  it('hydrates a valid ?status=REJECTED from the URL', async () => {
    const { result } = renderAt('/assistants?status=REJECTED')

    await waitFor(() => {
      expect(result.current.filters.status).toBe('REJECTED')
    })
  })

  it('falls back to ALL for an invalid status value (e.g. ?status=APPROVED)', async () => {
    const { result } = renderAt('/assistants?status=APPROVED')

    await waitFor(() => {
      expect(result.current.filters.status).toBe('ALL')
    })
  })

  it('updates the URL when status filter is changed', async () => {
    const { result } = renderAt('/assistants')

    await waitFor(() => {
      expect(result.current.filters.status).toBe('ALL')
    })

    act(() => {
      result.current.setFilters({
        search: '',
        category: '',
        waitTime: '',
        sortBy: '',
        status: 'PENDING',
      })
    })

    await waitFor(() => {
      expect(result.current.filters.status).toBe('PENDING')
    })
  })

  it('omits status from URL when it is set back to ALL', async () => {
    const { result } = renderAt('/assistants?status=PENDING')

    await waitFor(() => {
      expect(result.current.filters.status).toBe('PENDING')
    })

    act(() => {
      result.current.setFilters({
        search: '',
        category: '',
        waitTime: '',
        sortBy: '',
        status: 'ALL',
      })
    })

    await waitFor(() => {
      expect(result.current.filters.status).toBe('ALL')
    })
  })

  it('preserves unrelated URL params when updating status', async () => {
    const { result } = renderAt('/assistants?category=devops&status=PENDING')

    await waitFor(() => {
      expect(result.current.filters.status).toBe('PENDING')
      expect(result.current.filters.category).toBe('devops')
    })

    act(() => {
      result.current.setFilters({
        search: '',
        category: 'devops',
        waitTime: '',
        sortBy: '',
        status: 'VERIFIED',
      })
    })

    await waitFor(() => {
      expect(result.current.filters.status).toBe('VERIFIED')
      expect(result.current.filters.category).toBe('devops')
    })
  })
})
