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

import { act, render, screen } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import { favoritesStore } from '@/store/favorites'
import type { Assistant } from '@/types/entity/assistant'

import AssistantsList from '../AssistantList'

const storeState = vi.hoisted(() => ({
  pagination: { totalCount: 5 as number | null },
  assistantTemplatesPagination: { totalCount: 3 as number | null },
}))

vi.mock('../AssistantGrid/AssistantGrid', () => ({
  default: () => <div data-testid="assistant-grid-stub">stale card</div>,
}))

vi.mock('@/hooks/useVueRouter', () => ({
  useVueRouter: () => ({ push: vi.fn() }),
}))

vi.mock('@/store', () => ({
  userStore: { user: null },
}))

vi.mock('@/store/favorites', async () => {
  const { proxy } = await import('valtio')
  return {
    favoritesStore: proxy({
      assistantsPagination: { page: 0, perPage: 12, totalPages: 0, totalCount: 0 },
    }),
  }
})

vi.mock('@/pages/assistants/hooks/useAssistants', () => ({
  useAssistants: () => ({
    assistants: [],
    assistantTemplates: [],
    assistantTemplatesPagination: storeState.assistantTemplatesPagination,
    pagination: storeState.pagination,
  }),
}))

const reloadAssistants = vi.fn()

// The queue clears the region, sets the text on the next frame and holds it for a 1s gap.
const flushAnnouncements = async () => {
  await act(async () => {
    vi.runAllTimers()
  })
}

describe('AssistantsList', () => {
  beforeEach(() => {
    vi.useFakeTimers()
    storeState.pagination = { totalCount: 5 }
    storeState.assistantTemplatesPagination = { totalCount: 3 }
    favoritesStore.assistantsPagination = { page: 0, perPage: 12, totalPages: 0, totalCount: 0 }
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  describe('loading', () => {
    it('renders only the spinner while loading, so stale cards are not reachable', () => {
      const { rerender } = render(
        <AssistantsList reloadAssistants={reloadAssistants} loading={false} />
      )
      expect(screen.getByTestId('assistant-grid-stub')).toBeInTheDocument()

      rerender(<AssistantsList reloadAssistants={reloadAssistants} loading={true} />)
      expect(screen.queryByTestId('assistant-grid-stub')).not.toBeInTheDocument()

      rerender(<AssistantsList reloadAssistants={reloadAssistants} loading={false} />)
      expect(screen.getByTestId('assistant-grid-stub')).toBeInTheDocument()
    })

    it('keeps the live region mounted while loading', () => {
      const { container, rerender } = render(
        <AssistantsList reloadAssistants={reloadAssistants} loading={false} />
      )
      const region = container.querySelector('output[aria-live]')
      expect(region).not.toBeNull()

      // The Spinner has its own role="status", so the live region is selected by element.
      rerender(<AssistantsList reloadAssistants={reloadAssistants} loading={true} />)
      expect(container.querySelector('output[aria-live]')).toBe(region)
    })
  })

  describe('announcement', () => {
    it('announces the count once a filtered search completes', async () => {
      const { rerender } = render(
        <AssistantsList reloadAssistants={reloadAssistants} hasActiveFilter searchVersion={0} />
      )
      rerender(
        <AssistantsList reloadAssistants={reloadAssistants} hasActiveFilter searchVersion={1} />
      )
      await flushAnnouncements()
      expect(screen.getByRole('status')).toHaveTextContent('5 assistants')
    })

    it('uses the singular noun for one match', async () => {
      storeState.pagination = { totalCount: 1 }
      const { rerender } = render(
        <AssistantsList reloadAssistants={reloadAssistants} hasActiveFilter searchVersion={0} />
      )
      rerender(
        <AssistantsList reloadAssistants={reloadAssistants} hasActiveFilter searchVersion={1} />
      )
      await flushAnnouncements()
      expect(screen.getByRole('status')).toHaveTextContent(/^1 assistant$/)
    })

    it('announces "No assistants found" when a search returns nothing', async () => {
      storeState.pagination = { totalCount: 0 }
      const { rerender } = render(
        <AssistantsList reloadAssistants={reloadAssistants} hasActiveFilter searchVersion={0} />
      )
      rerender(
        <AssistantsList reloadAssistants={reloadAssistants} hasActiveFilter searchVersion={1} />
      )
      await flushAnnouncements()
      expect(screen.getByRole('status')).toHaveTextContent('No assistants found')
    })

    it('announces "No templates found" on the Templates tab', async () => {
      storeState.assistantTemplatesPagination = { totalCount: 0 }
      const { rerender } = render(
        <AssistantsList
          reloadAssistants={reloadAssistants}
          isTemplate
          hasActiveFilter
          searchVersion={0}
        />
      )
      rerender(
        <AssistantsList
          reloadAssistants={reloadAssistants}
          isTemplate
          hasActiveFilter
          searchVersion={1}
        />
      )
      await flushAnnouncements()
      expect(screen.getByRole('status')).toHaveTextContent('No templates found')
    })

    // A saved search makes hasActiveFilter true on mount while totalCount still holds the count
    // from the last visit. Only the completed search may be announced.
    it('does not announce the stale count on mount with a saved search', async () => {
      storeState.pagination = { totalCount: 42 }
      const { rerender } = render(
        <AssistantsList reloadAssistants={reloadAssistants} hasActiveFilter searchVersion={0} />
      )
      await flushAnnouncements()
      expect(screen.getByRole('status')).toHaveTextContent('')

      storeState.pagination = { totalCount: 5 }
      rerender(
        <AssistantsList reloadAssistants={reloadAssistants} hasActiveFilter searchVersion={1} />
      )
      await flushAnnouncements()
      expect(screen.getByRole('status')).toHaveTextContent('5 assistants')
    })

    it('does not announce when the filter turns on before results arrive', async () => {
      const { rerender } = render(
        <AssistantsList
          reloadAssistants={reloadAssistants}
          hasActiveFilter={false}
          searchVersion={0}
        />
      )
      rerender(
        <AssistantsList reloadAssistants={reloadAssistants} hasActiveFilter searchVersion={0} />
      )
      await flushAnnouncements()
      expect(screen.getByRole('status')).toHaveTextContent('')
    })

    it('does not announce when no filter is active', async () => {
      const { rerender } = render(
        <AssistantsList
          reloadAssistants={reloadAssistants}
          hasActiveFilter={false}
          searchVersion={0}
        />
      )
      rerender(
        <AssistantsList
          reloadAssistants={reloadAssistants}
          hasActiveFilter={false}
          searchVersion={1}
        />
      )
      await flushAnnouncements()
      expect(screen.getByRole('status')).toHaveTextContent('')
    })

    it('does not announce when totalCount is not loaded yet', async () => {
      storeState.pagination = { totalCount: null }
      const { rerender } = render(
        <AssistantsList reloadAssistants={reloadAssistants} hasActiveFilter searchVersion={0} />
      )
      rerender(
        <AssistantsList reloadAssistants={reloadAssistants} hasActiveFilter searchVersion={1} />
      )
      await flushAnnouncements()
      expect(screen.getByRole('status')).toHaveTextContent('')
    })

    // The store write that updates totalCount renders before the searchVersion bump; the count
    // change alone must not announce, or each search is read out twice.
    it('announces only when searchVersion changes, not when totalCount alone changes', async () => {
      const { rerender } = render(
        <AssistantsList reloadAssistants={reloadAssistants} hasActiveFilter searchVersion={0} />
      )
      storeState.pagination = { totalCount: 10 }
      rerender(
        <AssistantsList reloadAssistants={reloadAssistants} hasActiveFilter searchVersion={0} />
      )
      await flushAnnouncements()
      expect(screen.getByRole('status')).toHaveTextContent('')

      rerender(
        <AssistantsList reloadAssistants={reloadAssistants} hasActiveFilter searchVersion={1} />
      )
      await flushAnnouncements()
      expect(screen.getByRole('status')).toHaveTextContent('10 assistants')
    })

    it('re-announces when the same search completes again', async () => {
      const { rerender } = render(
        <AssistantsList reloadAssistants={reloadAssistants} hasActiveFilter searchVersion={0} />
      )
      rerender(
        <AssistantsList reloadAssistants={reloadAssistants} hasActiveFilter searchVersion={1} />
      )
      await flushAnnouncements()
      expect(screen.getByRole('status')).toHaveTextContent('5 assistants')

      rerender(
        <AssistantsList reloadAssistants={reloadAssistants} hasActiveFilter searchVersion={2} />
      )
      // The queue clears the region first so the same text is read again.
      expect(screen.getByRole('status')).toHaveTextContent('')
      await flushAnnouncements()
      expect(screen.getByRole('status')).toHaveTextContent('5 assistants')
    })

    // Favorites passes one page of assistants; the announced count must be the search total.
    it('announces the Favorites total, not the size of the loaded page', async () => {
      const page = Array.from({ length: 12 }, (_, i) => ({ id: `fav-${i}` } as Assistant))
      favoritesStore.assistantsPagination = { page: 0, perPage: 12, totalPages: 3, totalCount: 30 }
      const { rerender } = render(
        <AssistantsList
          reloadAssistants={reloadAssistants}
          assistants={page}
          hasActiveFilter
          searchVersion={0}
        />
      )
      rerender(
        <AssistantsList
          reloadAssistants={reloadAssistants}
          assistants={page}
          hasActiveFilter
          searchVersion={1}
        />
      )
      await flushAnnouncements()
      expect(screen.getByRole('status')).toHaveTextContent('30 assistants')
    })

    it('falls back to the Favorites page length when the response has no total', async () => {
      const page = Array.from({ length: 2 }, (_, i) => ({ id: `fav-${i}` } as Assistant))
      const { rerender } = render(
        <AssistantsList
          reloadAssistants={reloadAssistants}
          assistants={page}
          hasActiveFilter
          searchVersion={0}
        />
      )
      rerender(
        <AssistantsList
          reloadAssistants={reloadAssistants}
          assistants={page}
          hasActiveFilter
          searchVersion={1}
        />
      )
      await flushAnnouncements()
      expect(screen.getByRole('status')).toHaveTextContent('2 assistants')
    })

    it('announces the count when the filter is cleared', async () => {
      const { rerender } = render(
        <AssistantsList reloadAssistants={reloadAssistants} hasActiveFilter searchVersion={0} />
      )
      storeState.pagination = { totalCount: 1 }
      rerender(
        <AssistantsList reloadAssistants={reloadAssistants} hasActiveFilter searchVersion={1} />
      )
      await flushAnnouncements()
      expect(screen.getByRole('status')).toHaveTextContent(/^1 assistant$/)

      // The filter turns off first; the count is announced only once the reload completes.
      rerender(
        <AssistantsList
          reloadAssistants={reloadAssistants}
          hasActiveFilter={false}
          searchVersion={1}
        />
      )
      storeState.pagination = { totalCount: 24 }
      rerender(
        <AssistantsList
          reloadAssistants={reloadAssistants}
          hasActiveFilter={false}
          searchVersion={2}
        />
      )
      await flushAnnouncements()
      expect(screen.getByRole('status')).toHaveTextContent('24 assistants')
    })

    it('stays silent on later loads once the cleared filter has been announced', async () => {
      const { rerender } = render(
        <AssistantsList reloadAssistants={reloadAssistants} hasActiveFilter searchVersion={0} />
      )
      rerender(
        <AssistantsList reloadAssistants={reloadAssistants} hasActiveFilter searchVersion={1} />
      )
      rerender(
        <AssistantsList
          reloadAssistants={reloadAssistants}
          hasActiveFilter={false}
          searchVersion={2}
        />
      )
      await flushAnnouncements()
      expect(screen.getByRole('status')).toHaveTextContent('5 assistants')

      // Paging with no filter: the queue would clear the region first if it announced.
      rerender(
        <AssistantsList
          reloadAssistants={reloadAssistants}
          hasActiveFilter={false}
          searchVersion={3}
        />
      )
      expect(screen.getByRole('status')).toHaveTextContent('5 assistants')
    })
  })
})
