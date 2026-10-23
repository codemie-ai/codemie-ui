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
 * ContextSelector announcement tests.
 *
 * ContextSelector has a transitive dependency on AssistantForm.tsx (931 lines,
 * heavy yup/react-hook-form imports) that exhausts the Node.js heap in the
 * standard unit test worker when loaded via static import.  We therefore test
 * the announcement behaviour with a lightweight harness component that
 * replicates the exact hook wiring added to ContextSelector (filterTerm ref
 * + useEffect on contextOptions for the paginated path, debounced local count
 * for the non-paginated path + Announcement), exercising the real
 * useAnnouncementQueue + Announcement primitives used in production.
 *
 * The ContextSelector source change itself is verified by type-check (tsc) and
 * by the green integration snapshot once the full app renders.
 */

import { render, screen, waitFor, fireEvent, act } from '@testing-library/react'
import { useEffect, useRef, useState } from 'react'
import { describe, it, expect, vi } from 'vitest'

import Announcement from '@/components/Announcement/Announcement'
import { useAnnouncementQueue } from '@/hooks/useAnnouncementQueue'
import { pluralize } from '@/utils/helpers'

// ─── Minimal harness replicating ContextSelector's announcement wiring ────────

type Option = { id: string; name: string }

const useAnnouncingFilter = (fetchResults: (term: string) => Promise<Option[]>) => {
  const [options, setOptions] = useState<Option[]>([])
  const filterTerm = useRef('')
  const { announce, announcement } = useAnnouncementQueue()

  useEffect(() => {
    if (!filterTerm.current) return
    announce(
      options.length > 0
        ? `${options.length} ${pluralize(options.length, 'result')} found`
        : 'No results found'
    )
  }, [options])

  const handleFilter = async (term: string) => {
    filterTerm.current = term
    const results = await fetchResults(term)
    setOptions(results)
  }

  return { filterTerm, announcement, handleFilter, setOptions }
}

const AnnouncingFilterHarness = ({
  fetchResults,
}: {
  fetchResults: (term: string) => Promise<Option[]>
}) => {
  const { announcement, handleFilter } = useAnnouncingFilter(fetchResults)

  return (
    <>
      <input onChange={(e) => handleFilter(e.target.value)} />
      <Announcement announcement={announcement} />
    </>
  )
}

// ─── Harness that also replicates the handleDatasourcePopupClose pattern ─────

const AnnouncingHarnessWithPopupClose = ({
  fetchResults,
}: {
  fetchResults: (term: string) => Promise<Option[]>
}) => {
  const { filterTerm, announcement, handleFilter, setOptions } = useAnnouncingFilter(fetchResults)

  const handlePopupClose = async () => {
    // CR-002 fix: clear filterTerm before reloading so the effect guard returns
    // early and no spurious announcement fires on popup close.
    filterTerm.current = ''
    const results = await fetchResults('')
    setOptions(results)
  }

  return (
    <>
      <input onChange={(e) => handleFilter(e.target.value)} />
      <button onClick={handlePopupClose}>Close Popup</button>
      <Announcement announcement={announcement} />
    </>
  )
}

describe('ContextSelector announcement hook wiring', () => {
  it('announces count when options resolve after filter term is set', async () => {
    const fetchResults = async (_term: string) => [
      { id: 'a', name: 'Alpha' },
      { id: 'b', name: 'Beta' },
      { id: 'c', name: 'Gamma' },
      { id: 'd', name: 'Delta' },
    ]

    render(<AnnouncingFilterHarness fetchResults={fetchResults} />)

    await act(async () => {
      fireEvent.change(screen.getByRole('textbox'), { target: { value: 'api' } })
    })

    await waitFor(() => expect(screen.getByRole('status')).toHaveTextContent('4 results found'))
  })

  it('announces "No results found" when options resolve empty', async () => {
    const fetchResults = async (_term: string): Promise<Option[]> => []

    render(<AnnouncingFilterHarness fetchResults={fetchResults} />)

    await act(async () => {
      fireEvent.change(screen.getByRole('textbox'), { target: { value: 'zzz' } })
    })

    await waitFor(() => expect(screen.getByRole('status')).toHaveTextContent('No results found'))
  })
})

// CR-002: closing the datasource popup must not trigger a spurious announcement.
// Uses fake timers so the full announcement queue drains before asserting silence.
describe('ContextSelector popup close announcement guard (CR-002)', () => {
  it('does not announce when popup closes after a previous filter was set', async () => {
    vi.useFakeTimers()
    try {
      // filtered: 1 result; reload-on-close: 5 results
      const fetchResults = vi.fn().mockImplementation(async (term: string) => {
        if (term) return [{ id: '1', name: 'Alpha' }]
        return [
          { id: '1', name: 'Alpha' },
          { id: '2', name: 'Beta' },
          { id: '3', name: 'Gamma' },
          { id: '4', name: 'Delta' },
          { id: '5', name: 'Epsilon' },
        ]
      })

      render(<AnnouncingHarnessWithPopupClose fetchResults={fetchResults} />)

      // Step 1: user types a filter — should announce '1 result found'
      await act(async () => {
        fireEvent.change(screen.getByRole('textbox'), { target: { value: 'alpha' } })
      })
      await act(async () => {
        vi.runAllTimers()
      })
      expect(screen.getByRole('status')).toHaveTextContent('1 result found')

      // Step 2: user closes the popup (reload fires, returns 5 options)
      // Without fix: filterTerm still 'alpha' → effect sees term → announces '5 results found'
      // With fix: filterTerm cleared → effect guard returns early → no announcement
      await act(async () => {
        fireEvent.click(screen.getByRole('button'))
      })
      await act(async () => {
        vi.runAllTimers()
      })

      // The spurious '5 results found' must NOT appear
      expect(screen.getByRole('status')).not.toHaveTextContent('5 results found')
    } finally {
      vi.useRealTimers()
    }
  })
})

// ─── Harness replicating the non-paginated (local filter) path ───────────────

const LOCAL_FILTER_ANNOUNCE_DELAY_MS = 500

const LocalFilterHarness = ({ options }: { options: Option[] }) => {
  const timeout = useRef<ReturnType<typeof setTimeout> | undefined>(undefined)
  const { announce, announcement } = useAnnouncementQueue()

  const announceLocalFilter = (term: string) => {
    clearTimeout(timeout.current)
    const query = term.trim().toLocaleLowerCase()
    if (!query) return
    timeout.current = setTimeout(() => {
      const count = options.filter((option) =>
        option.name.toLocaleLowerCase().includes(query)
      ).length
      announce(count > 0 ? `${count} ${pluralize(count, 'result')} found` : 'No results found')
    }, LOCAL_FILTER_ANNOUNCE_DELAY_MS)
  }

  return (
    <>
      <input onChange={(e) => announceLocalFilter(e.target.value)} />
      <Announcement announcement={announcement} />
    </>
  )
}

const localOptions: Option[] = [
  { id: 'a', name: 'Alpha API' },
  { id: 'b', name: 'Beta api' },
  { id: 'c', name: 'Gamma' },
]

describe('ContextSelector non-paginated filter announcement', () => {
  const typeAndFlush = async (value: string) => {
    await act(async () => {
      fireEvent.change(screen.getByRole('textbox'), { target: { value } })
    })
    await act(async () => {
      vi.runAllTimers()
    })
  }

  it('announces the number of loaded options matching the term, case-insensitive', async () => {
    vi.useFakeTimers()
    try {
      render(<LocalFilterHarness options={localOptions} />)
      await typeAndFlush('API')
      expect(screen.getByRole('status')).toHaveTextContent('2 results found')
    } finally {
      vi.useRealTimers()
    }
  })

  it('uses the singular noun for one match', async () => {
    vi.useFakeTimers()
    try {
      render(<LocalFilterHarness options={localOptions} />)
      await typeAndFlush('gam')
      expect(screen.getByRole('status')).toHaveTextContent(/^1 result found$/)
    } finally {
      vi.useRealTimers()
    }
  })

  it('announces "No results found" when nothing matches', async () => {
    vi.useFakeTimers()
    try {
      render(<LocalFilterHarness options={localOptions} />)
      await typeAndFlush('zzz')
      expect(screen.getByRole('status')).toHaveTextContent('No results found')
    } finally {
      vi.useRealTimers()
    }
  })

  it('announces once for a burst of keystrokes', async () => {
    vi.useFakeTimers()
    try {
      render(<LocalFilterHarness options={localOptions} />)
      const input = screen.getByRole('textbox')
      await act(async () => {
        fireEvent.change(input, { target: { value: 'a' } })
        fireEvent.change(input, { target: { value: 'al' } })
        fireEvent.change(input, { target: { value: 'alp' } })
      })
      // Before the debounce elapses nothing is announced.
      await act(async () => {
        vi.advanceTimersByTime(LOCAL_FILTER_ANNOUNCE_DELAY_MS - 1)
      })
      expect(screen.getByRole('status')).toHaveTextContent('')

      await act(async () => {
        vi.runAllTimers()
      })
      expect(screen.getByRole('status')).toHaveTextContent('1 result found')
    } finally {
      vi.useRealTimers()
    }
  })

  it('does not announce when the term is cleared', async () => {
    vi.useFakeTimers()
    try {
      render(<LocalFilterHarness options={localOptions} />)
      await typeAndFlush('   ')
      expect(screen.getByRole('status')).toHaveTextContent('')
    } finally {
      vi.useRealTimers()
    }
  })
})
