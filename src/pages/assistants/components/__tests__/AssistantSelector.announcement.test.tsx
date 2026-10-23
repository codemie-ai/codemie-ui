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

/**
 * AssistantSelector announcement tests.
 *
 * AssistantSelector has a transitive dependency on AssistantForm.tsx (heavy
 * yup/react-hook-form imports) that exhausts the Node.js heap in unit test
 * workers when loaded directly.  We therefore test the announcement behaviour
 * with a lightweight harness component that replicates the exact hook wiring
 * added to AssistantSelector (isAnnouncePending ref + handleFilter wrapper +
 * useEffect on options + Announcement), exercising the real
 * useAnnouncementQueue + Announcement primitives used in production.
 *
 * The AssistantSelector source change itself is verified by type-check (tsc)
 * and by the green integration snapshot once the full app renders.
 */

import { render, screen, waitFor, fireEvent, act } from '@testing-library/react'
import { useEffect, useRef, useState } from 'react'
import { describe, it, expect, vi } from 'vitest'

import Announcement from '@/components/Announcement/Announcement'
import { useAnnouncementQueue } from '@/hooks/useAnnouncementQueue'
import { pluralize } from '@/utils/helpers'

// ─── Minimal harness replicating AssistantSelector's announcement wiring ─────

type AssistantOption = { id: string; name: string }

const AnnouncingPaginatedHarness = ({
  loadResults,
  loadNextPage = async () => [],
}: {
  loadResults: (term: string) => Promise<AssistantOption[]>
  loadNextPage?: () => Promise<AssistantOption[]>
}) => {
  const [options, setOptions] = useState<AssistantOption[]>([])
  const isAnnouncePending = useRef(false)
  const { announce, announcement } = useAnnouncementQueue()

  useEffect(() => {
    if (!isAnnouncePending.current) return
    isAnnouncePending.current = false
    announce(
      options.length > 0
        ? `${options.length} ${pluralize(options.length, 'result')} found`
        : 'No results found'
    )
  }, [options])

  const handleFilter = async (term: string) => {
    isAnnouncePending.current = !!term
    const results = await loadResults(term)
    setOptions(results)
  }

  // Mirrors usePaginatedOptions.handleScrollBottom: appends the next page to options.
  const handleScrollBottom = async () => {
    const nextPage = await loadNextPage()
    setOptions((prev) => [...prev, ...nextPage])
  }

  return (
    <>
      <input onChange={(e) => handleFilter(e.target.value)} />
      <button onClick={handleScrollBottom}>Scroll bottom</button>
      <Announcement announcement={announcement} />
    </>
  )
}

const makeOptions = (count: number, offset = 0): AssistantOption[] =>
  Array.from({ length: count }, (_, i) => ({ id: `${offset + i}`, name: `Bot ${offset + i}` }))

describe('AssistantSelector announcement hook wiring', () => {
  it('announces count when assistant options resolve after filter term is set', async () => {
    const loadResults = async (_term: string) => [
      { id: '1', name: 'Alpha Bot' },
      { id: '2', name: 'Beta Bot' },
    ]

    render(<AnnouncingPaginatedHarness loadResults={loadResults} />)

    await act(async () => {
      fireEvent.change(screen.getByRole('textbox'), { target: { value: 'bot' } })
    })

    await waitFor(() => expect(screen.getByRole('status')).toHaveTextContent('2 results found'))
  })

  it('announces "No results found" when assistant options resolve empty', async () => {
    const loadResults = async (_term: string): Promise<AssistantOption[]> => []

    render(<AnnouncingPaginatedHarness loadResults={loadResults} />)

    await act(async () => {
      fireEvent.change(screen.getByRole('textbox'), { target: { value: 'zzz' } })
    })

    await waitFor(() => expect(screen.getByRole('status')).toHaveTextContent('No results found'))
  })

  it('uses the singular noun for one match', async () => {
    render(<AnnouncingPaginatedHarness loadResults={async () => makeOptions(1)} />)

    await act(async () => {
      fireEvent.change(screen.getByRole('textbox'), { target: { value: 'bot' } })
    })

    await waitFor(() => expect(screen.getByRole('status')).toHaveTextContent(/^1 result found$/))
  })

  it('does not re-announce when scrolling loads the next page of a search', async () => {
    vi.useFakeTimers()
    try {
      render(
        <AnnouncingPaginatedHarness
          loadResults={async () => makeOptions(12)}
          loadNextPage={async () => makeOptions(12, 12)}
        />
      )

      await act(async () => {
        fireEvent.change(screen.getByRole('textbox'), { target: { value: 'bot' } })
      })
      await act(async () => {
        vi.runAllTimers()
      })
      expect(screen.getByRole('status')).toHaveTextContent('12 results found')

      await act(async () => {
        fireEvent.click(screen.getByRole('button', { name: 'Scroll bottom' }))
      })
      await act(async () => {
        vi.runAllTimers()
      })
      expect(screen.getByRole('status')).not.toHaveTextContent('24 results found')
      expect(screen.getByRole('status')).toHaveTextContent('12 results found')
    } finally {
      vi.useRealTimers()
    }
  })

  it('does not announce when the search box is cleared', async () => {
    vi.useFakeTimers()
    try {
      render(<AnnouncingPaginatedHarness loadResults={async () => makeOptions(30)} />)

      await act(async () => {
        fireEvent.change(screen.getByRole('textbox'), { target: { value: '' } })
      })
      await act(async () => {
        vi.runAllTimers()
      })
      expect(screen.getByRole('status')).toHaveTextContent('')
    } finally {
      vi.useRealTimers()
    }
  })
})
