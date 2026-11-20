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

import { act, render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, it, expect, vi } from 'vitest'

import api from '@/utils/api'

import ProjectActivityHistoryModal from '../ProjectActivityHistoryModal'

const renderHistory = (projectName: string) =>
  render(
    <ProjectActivityHistoryModal
      projectInstanceId={projectName}
      projectName={projectName}
      onHide={vi.fn()}
    />
  )

vi.mock('@/utils/api')

const { mockSearchUsers } = vi.hoisted(() => ({ mockSearchUsers: vi.fn() }))
vi.mock('@/store/user', () => ({ userStore: { searchUsers: mockSearchUsers } }))

// ActorSelector wraps PrimeReact's virtual-scroll MultiSelect which has no real layout in jsdom.
// Capture onChange so tests can directly simulate actor selection/clear.
let simulateActorSelect: (id: string | null) => void = () => {}
vi.mock('@/components/ActorSelector/ActorSelector', () => ({
  default: ({
    value,
    onChange,
    placeholder,
  }: {
    value: string | null
    onChange: (id: string | null) => void
    placeholder?: string
  }) => {
    simulateActorSelect = onChange
    return (
      <button type="button" data-testid="actor-selector">
        {value ? `Selected: ${value}` : placeholder ?? 'Filter by actor'}
      </button>
    )
  },
}))

function mockEventsResponse(overrides = {}) {
  return {
    json: async () => ({
      data: [
        {
          id: '1',
          domain: 'members',
          event_type: 'member_added',
          label: 'Member added',
          category: 'Members',
          entity_label: 'Jane Doe',
          actor_name: 'Admin',
          actor_email: 'a@x.com',
          attributes: { role: 'viewer' },
          created_at: '2026-01-01T00:00:00Z',
        },
      ],
      pagination: { page: 0, per_page: 50, total: 1, pages: 1 },
      recording_enabled: true,
      ...overrides,
    }),
  }
}

describe('ProjectActivityHistoryModal — total count', () => {
  it('renders the total matching count returned by the API', async () => {
    ;(api.get as any).mockImplementation((path: string) =>
      path.includes('/metadata')
        ? {
            json: async () => ({
              categories: ['Budget', 'Members', 'Settings', 'Account'],
              domains: [],
              event_types: [],
              recording_enabled: true,
            }),
          }
        : mockEventsResponse({ pagination: { page: 0, per_page: 50, total: 123, pages: 3 } })
    )
    renderHistory('proj-1')
    expect(await screen.findByText(/123/)).toBeInTheDocument()
  })
})

describe('ProjectActivityHistoryModal', () => {
  it('shows separately labeled changes for max and soft budgets', async () => {
    vi.mocked(api.get).mockImplementation(
      (path) =>
        Promise.resolve(
          path.includes('/metadata')
            ? {
                json: async () => ({
                  categories: ['Budget', 'Members', 'Settings', 'Account'],
                  domains: [],
                  event_types: [],
                  recording_enabled: true,
                }),
              }
            : mockEventsResponse({
                data: [
                  {
                    id: 'budget-change',
                    domain: 'budget_management',
                    event_type: 'budget.project_budget.updated',
                    label: 'Budget updated',
                    category: 'Budget',
                    attributes: {
                      previous_max_budget: 100,
                      new_max_budget: 150,
                      previous_soft_budget: 80,
                      new_soft_budget: 75,
                      note: 'Existing detail',
                    },
                    created_at: '2026-01-01T00:00:00Z',
                  },
                ],
              })
        ) as ReturnType<typeof api.get>
    )
    renderHistory('demo')
    await screen.findByText('Budget updated')
    await userEvent.click(screen.getByRole('button', { name: /expand/i }))

    expect(await screen.findByText('Previous max budget')).toBeInTheDocument()
    expect(screen.getByText('Previous max budget').nextElementSibling).toHaveTextContent('$100.00')
    expect(screen.getByText('New max budget').nextElementSibling).toHaveTextContent('$150.00')
    expect(screen.getByText('Previous soft budget').nextElementSibling).toHaveTextContent('$80.00')
    expect(screen.getByText('New soft budget').nextElementSibling).toHaveTextContent('$75.00')
    expect(screen.getByText('Existing detail')).toBeInTheDocument()

    const maxBudgetChange = screen.getByText('Max budget change').nextElementSibling
    expect(maxBudgetChange).toHaveTextContent('+$50.00')
    expect(maxBudgetChange).toHaveClass('text-success-primary')

    const softBudgetChange = screen.getByText('Soft limit change').nextElementSibling
    expect(softBudgetChange).toHaveTextContent('-$5.00')
    expect(softBudgetChange).toHaveClass('text-failed-primary')
  })

  it('does not show a budget change when either value is missing or not numeric', async () => {
    vi.mocked(api.get).mockImplementation(
      (path) =>
        Promise.resolve(
          path.includes('/metadata')
            ? {
                json: async () => ({
                  categories: ['Budget', 'Members', 'Settings', 'Account'],
                  domains: [],
                  event_types: [],
                  recording_enabled: true,
                }),
              }
            : mockEventsResponse({
                data: [
                  {
                    id: 'invalid-budget-change',
                    domain: 'budget_management',
                    event_type: 'budget.project_budget.updated',
                    label: 'Budget updated',
                    category: 'Budget',
                    attributes: {
                      previous_max_budget: 100,
                      previous_soft_budget: '80',
                      new_soft_budget: 75,
                    },
                    created_at: '2026-01-01T00:00:00Z',
                  },
                ],
              })
        ) as ReturnType<typeof api.get>
    )
    renderHistory('demo')
    await screen.findByText('Budget updated')
    await userEvent.click(screen.getByRole('button', { name: /expand/i }))

    expect(await screen.findByText('Previous max budget')).toBeInTheDocument()
    expect(screen.queryByText('Max budget change')).not.toBeInTheDocument()
    expect(screen.queryByText('Soft limit change')).not.toBeInTheDocument()
  })

  it('keeps rounded zero budget changes neutral', async () => {
    vi.mocked(api.get).mockImplementation(
      (path) =>
        Promise.resolve(
          path.includes('/metadata')
            ? {
                json: async () => ({
                  categories: ['Budget', 'Members', 'Settings', 'Account'],
                  domains: [],
                  event_types: [],
                  recording_enabled: true,
                }),
              }
            : mockEventsResponse({
                data: [
                  {
                    id: 'rounded-budget-change',
                    domain: 'budget_management',
                    event_type: 'budget.project_budget.updated',
                    label: 'Budget updated',
                    category: 'Budget',
                    attributes: { previous_max_budget: 100.001, new_max_budget: 100.004 },
                    created_at: '2026-01-01T00:00:00Z',
                  },
                ],
              })
        ) as ReturnType<typeof api.get>
    )
    renderHistory('demo')
    await screen.findByText('Budget updated')
    await userEvent.click(screen.getByRole('button', { name: /expand/i }))

    const maxBudgetChange = await screen.findByText('Max budget change')
    expect(maxBudgetChange.nextElementSibling).toHaveTextContent('$0.00')
    expect(maxBudgetChange.nextElementSibling).toHaveClass('text-text-primary')
  })

  it('renders event rows with actor/target/label from the API, expands to show attribute rows, never raw JSON', async () => {
    ;(api.get as any).mockImplementation((path: string) =>
      path.includes('/metadata')
        ? {
            json: async () => ({
              categories: ['Budget', 'Members', 'Settings', 'Account'],
              domains: [],
              event_types: [],
              recording_enabled: true,
            }),
          }
        : mockEventsResponse()
    )
    renderHistory('proj-1')
    expect(await screen.findByText('Member added')).toBeInTheDocument()
    expect(screen.getByText('Jane Doe')).toBeInTheDocument()
    await userEvent.click(screen.getByRole('button', { name: /expand/i }))
    expect(await screen.findByText('viewer')).toBeInTheDocument()
    expect(screen.queryByText('Difference')).not.toBeInTheDocument()
    expect(screen.queryByText(/^\{/)).not.toBeInTheDocument()
  })

  it('shows a distinct disabled state when recording_enabled is false, not the empty state', async () => {
    ;(api.get as any).mockImplementation((path: string) =>
      path.includes('/metadata')
        ? {
            json: async () => ({
              categories: ['Budget', 'Members', 'Settings', 'Account'],
              domains: [],
              event_types: [],
              recording_enabled: false,
            }),
          }
        : mockEventsResponse({ data: [], recording_enabled: false })
    )
    renderHistory('proj-1')
    expect(await screen.findByText(/activity recording is disabled/i)).toBeInTheDocument()
  })

  it('shows an error state with a retry action on a failed request', async () => {
    ;(api.get as any).mockRejectedValue(new Error('network down'))
    renderHistory('proj-1')
    expect(await screen.findByText(/network down/i)).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /retry/i })).toBeInTheDocument()
  })

  it('retries loadMetadata (not listEvents) after a metadata-only failure', async () => {
    let metadataCalls = 0
    ;(api.get as any).mockImplementation((path: string) => {
      if (path.includes('/metadata')) {
        metadataCalls += 1
        return Promise.reject(new Error('metadata down'))
      }
      return Promise.resolve(mockEventsResponse())
    })
    renderHistory('proj-1')
    expect(await screen.findByText(/metadata down/i)).toBeInTheDocument()
    expect(metadataCalls).toBe(1)

    await userEvent.click(screen.getByRole('button', { name: /retry/i }))
    expect(await screen.findByText(/metadata down/i)).toBeInTheDocument()
    expect(metadataCalls).toBe(2)
  })

  it('discards a stale, slower listEvents response that resolves after a newer request', async () => {
    let resolveFirst: (value: unknown) => void
    let callCount = 0
    ;(api.get as any).mockImplementation((path: string) => {
      if (path.includes('/metadata')) {
        return Promise.resolve({
          json: async () => ({
            categories: ['Budget', 'Members', 'Settings', 'Account'],
            domains: [],
            event_types: [],
            recording_enabled: true,
          }),
        })
      }
      callCount += 1
      if (callCount === 1) {
        return new Promise((resolve) => {
          resolveFirst = resolve
        })
      }
      return Promise.resolve(
        mockEventsResponse({
          data: [
            {
              id: '2',
              domain: 'members',
              event_type: 'member_removed',
              label: 'Member removed',
              category: 'Members',
              entity_label: 'John Doe',
              created_at: '2026-01-02T00:00:00Z',
            },
          ],
        })
      )
    })
    renderHistory('proj-1')

    const categorySelect = await screen.findByText(/all categories/i)
    await userEvent.click(categorySelect)
    await userEvent.click(await screen.findByText('Members'))
    await userEvent.keyboard('{Escape}')

    expect(await screen.findByText('Member removed')).toBeInTheDocument()

    await act(async () => {
      resolveFirst!(mockEventsResponse())
      await new Promise((resolve) => {
        setTimeout(resolve, 0)
      })
    })

    expect(screen.getByText('Member removed')).toBeInTheDocument()
    expect(screen.queryByText('Member added')).not.toBeInTheDocument()
  })
})

describe('ProjectActivityHistoryModal — expanded filters', () => {
  beforeEach(() => {
    // Reset captured ActorSelector onChange ref so one test cannot fire another's callback.
    simulateActorSelect = () => {}
  })

  function metadataResponse(overrides = {}) {
    return {
      json: async () => ({
        categories: ['Budget', 'Members', 'Settings', 'Account'],
        domains: [],
        event_types: [
          { event_type: 'member_added', label: 'Member added', category: 'Members' },
          { event_type: 'budget_updated', label: 'Budget updated', category: 'Budget' },
        ],
        recording_enabled: true,
        ...overrides,
      }),
    }
  }

  it('renders domain/event_type/actor_id/sort_dir controls and forwards each into listEvents', async () => {
    mockSearchUsers.mockResolvedValue([{ id: 'user-1', name: 'User One', email: 'user1@x.com' }])
    ;(api.get as any).mockImplementation((path: string) =>
      path.includes('/metadata')
        ? metadataResponse({ domains: ['assistant'] })
        : mockEventsResponse()
    )
    renderHistory('proj-1')
    await screen.findByText('Member added')

    await userEvent.click(await screen.findByText(/all categories/i))
    const categoryPanels = document.querySelectorAll('.p-multiselect-panel')
    await userEvent.click(
      within(categoryPanels[categoryPanels.length - 1] as HTMLElement).getByText('Budget')
    )
    await userEvent.keyboard('{Escape}')

    await userEvent.click(await screen.findByText(/all domains/i))
    const domainPanels = document.querySelectorAll('.p-multiselect-panel')
    await userEvent.click(
      within(domainPanels[domainPanels.length - 1] as HTMLElement).getByText('Assistant')
    )
    await userEvent.keyboard('{Escape}')

    await userEvent.click(await screen.findByText(/all events/i))
    const eventPanels = document.querySelectorAll('.p-multiselect-panel')
    await userEvent.click(
      within(eventPanels[eventPanels.length - 1] as HTMLElement).getByText('Member added')
    )
    await userEvent.keyboard('{Escape}')

    // Simulate actor selection via captured onChange (virtual scroll cannot render in jsdom)
    await act(async () => {
      simulateActorSelect('user-1')
    })

    const sortSelect = screen
      .getAllByText('Newest first')
      .find((el) => !el.closest('.p-hidden-accessible'))!
    await userEvent.click(sortSelect)
    await userEvent.click(await screen.findByText('Oldest first'))

    const lastCall = (api.get as any).mock.calls.at(-1)
    expect(lastCall[1].params).toMatchObject({
      category: ['Budget'],
      domain: ['assistant'],
      event_type: ['member_added'],
      actor_id: 'user-1',
      sort_dir: 'asc',
    })
  })

  it('forwards domain alone when only the Domain filter changes', async () => {
    ;(api.get as any).mockImplementation((path: string) =>
      path.includes('/metadata')
        ? metadataResponse({ domains: ['project_management'] })
        : mockEventsResponse()
    )
    renderHistory('proj-1')
    await screen.findByText('Member added')

    await userEvent.click(await screen.findByText(/all domains/i))
    const domainPanels = document.querySelectorAll('.p-multiselect-panel')
    await userEvent.click(
      within(domainPanels[domainPanels.length - 1] as HTMLElement).getByText('Project Management')
    )
    await userEvent.keyboard('{Escape}')

    const lastCall = (api.get as any).mock.calls.at(-1)
    expect(lastCall[1].params.domain).toEqual(['project_management'])
  })

  it('forwards event_type alone when only the Event type filter changes', async () => {
    ;(api.get as any).mockImplementation((path: string) =>
      path.includes('/metadata') ? metadataResponse() : mockEventsResponse()
    )
    renderHistory('proj-1')
    await screen.findByText('Member added')

    await userEvent.click(await screen.findByText(/all events/i))
    const eventPanels = document.querySelectorAll('.p-multiselect-panel')
    await userEvent.click(
      within(eventPanels[eventPanels.length - 1] as HTMLElement).getByText('Member added')
    )
    await userEvent.keyboard('{Escape}')

    const lastCall = (api.get as any).mock.calls.at(-1)
    expect(lastCall[1].params.event_type).toEqual(['member_added'])
  })

  it('forwards actor_id alone when only the Actor filter changes', async () => {
    mockSearchUsers.mockResolvedValue([{ id: 'user-1', name: 'User One', email: 'user1@x.com' }])
    ;(api.get as any).mockImplementation((path: string) =>
      path.includes('/metadata') ? metadataResponse() : mockEventsResponse()
    )
    renderHistory('proj-1')
    await screen.findByText('Member added')

    // Simulate actor selection via captured onChange (virtual scroll cannot render in jsdom)
    await act(async () => {
      simulateActorSelect('user-1')
    })

    const lastCall = (api.get as any).mock.calls.at(-1)
    expect(lastCall[1].params.actor_id).toBe('user-1')
  })

  it('forwards sort_dir alone when only the Sort control changes', async () => {
    ;(api.get as any).mockImplementation((path: string) =>
      path.includes('/metadata') ? metadataResponse() : mockEventsResponse()
    )
    renderHistory('proj-1')
    await screen.findByText('Member added')

    const sortSelect = screen
      .getAllByText('Newest first')
      .find((el) => !el.closest('.p-hidden-accessible'))!
    await userEvent.click(sortSelect)
    await userEvent.click(await screen.findByText('Oldest first'))

    const lastCall = (api.get as any).mock.calls.at(-1)
    expect(lastCall[1].params.sort_dir).toBe('asc')
  })

  it('shows only metadata categories and forwards the exact selected value', async () => {
    ;(api.get as any).mockImplementation((path: string) =>
      path.includes('/metadata')
        ? metadataResponse({ categories: ['Account'] })
        : mockEventsResponse()
    )
    renderHistory('proj-1')
    await screen.findByText('Member added')

    await userEvent.click(await screen.findByText(/all categories/i))
    const categoryPanels = document.querySelectorAll('.p-multiselect-panel')
    const categoryPanel = categoryPanels[categoryPanels.length - 1] as HTMLElement
    expect(within(categoryPanel).getByText('Account')).toBeInTheDocument()
    expect(within(categoryPanel).queryByText('Budget')).not.toBeInTheDocument()
    await userEvent.click(within(categoryPanel).getByText('Account'))
    await userEvent.keyboard('{Escape}')

    const lastCall = (api.get as any).mock.calls.at(-1)
    expect(lastCall[1].params.category).toEqual(['Account'])
  })

  it('uses exactly the domain values returned by metadata', async () => {
    ;(api.get as any).mockImplementation((path: string) =>
      path.includes('/metadata')
        ? metadataResponse({ domains: ['marketplace', 'hosted_application'] })
        : mockEventsResponse()
    )
    renderHistory('proj-1')
    await screen.findByText('Member added')
    await userEvent.click(await screen.findByText(/all domains/i))
    expect(await screen.findByText('Marketplace')).toBeInTheDocument()
    expect(screen.getByText('Hosted Application')).toBeInTheDocument()
    expect(screen.queryByText('Project Management')).not.toBeInTheDocument()
  })

  it('does not add fallback options when metadata returns no domains', async () => {
    ;(api.get as any).mockImplementation((path: string) =>
      path.includes('/metadata') ? metadataResponse({ domains: [] }) : mockEventsResponse()
    )
    renderHistory('proj-1')
    await screen.findByText('Member added')

    await userEvent.click(await screen.findByText(/all domains/i))
    expect(screen.queryByText('Project Management')).not.toBeInTheDocument()
    expect(screen.queryByText('Customer Configuration')).not.toBeInTheDocument()
  })

  it('disables metadata-backed filters while metadata is loading; actor stays interactive', async () => {
    let resolveMetadata: (v: unknown) => void
    ;(api.get as any).mockImplementation((path: string) => {
      if (path.includes('/metadata')) {
        return new Promise((resolve) => {
          resolveMetadata = resolve
        })
      }
      return Promise.resolve(mockEventsResponse())
    })
    renderHistory('proj-1')
    expect(screen.getByText(/all categories/i).closest('.p-disabled')).toBeTruthy()
    expect(screen.getByText(/all domains/i).closest('.p-disabled')).toBeTruthy()
    expect(screen.getByText(/all events/i).closest('.p-disabled')).toBeTruthy()
    // ActorSelector (UserSelector/MultiSelect trigger) should not be disabled
    expect(screen.getByText(/filter by actor/i).closest('.p-disabled')).toBeFalsy()
    resolveMetadata!(metadataResponse())
    await screen.findByText('Member added')
  })

  it('Clear filters resets every filter and reloads page 0', async () => {
    ;(api.get as any).mockImplementation((path: string) =>
      path.includes('/metadata') ? metadataResponse() : mockEventsResponse()
    )
    renderHistory('proj-1')
    await screen.findByText('Member added')
    // Set actor filter first so the clear has something real to reset
    await act(async () => {
      simulateActorSelect('user-1')
    })
    // Change sort direction to activate the Clear filters button
    const sortSelect = screen
      .getAllByText('Newest first')
      .find((el) => !el.closest('.p-hidden-accessible'))!
    await userEvent.click(sortSelect)
    await userEvent.click(await screen.findByText('Oldest first'))
    await userEvent.click(await screen.findByRole('button', { name: /clear filters/i }))
    const lastCall = (api.get as any).mock.calls.at(-1)
    expect(lastCall[1].params.actor_id).toBeUndefined()
    expect(lastCall[1].params.offset).toBe('0')
  })

  it('resets pagination to page 0 when a filter changes while on page 2', async () => {
    ;(api.get as any).mockImplementation((path: string) =>
      path.includes('/metadata')
        ? metadataResponse()
        : mockEventsResponse({ pagination: { page: 1, per_page: 50, total: 200, pages: 4 } })
    )
    renderHistory('proj-1')
    await screen.findByText('Member added')
    // Change sort direction to trigger a filter change
    const sortSelect = screen
      .getAllByText('Newest first')
      .find((el) => !el.closest('.p-hidden-accessible'))!
    await userEvent.click(sortSelect)
    await userEvent.click(await screen.findByText('Oldest first'))
    const lastCall = (api.get as any).mock.calls.at(-1)
    expect(lastCall[1].params.offset).toBe('0')
  })

  it('page-size change forwards the new limit with offset 0, from the 10/20/50/100 option list', async () => {
    ;(api.get as any).mockImplementation((path: string) =>
      path.includes('/metadata')
        ? metadataResponse()
        : mockEventsResponse({ pagination: { page: 0, per_page: 50, total: 200, pages: 4 } })
    )
    renderHistory('proj-1')
    await screen.findByText('Member added')
    const perPageTrigger = document.getElementById('per-page') as HTMLElement
    await userEvent.click(perPageTrigger)
    expect(screen.queryByText('90 items')).not.toBeInTheDocument()
    await userEvent.click(await screen.findByText('100 items'))
    const lastCall = (api.get as any).mock.calls.at(-1)
    expect(lastCall[1].params.limit).toBe('100')
    expect(lastCall[1].params.offset).toBe('0')
  })

  it('a second rapid page-size change still reloads once the first change settles', async () => {
    let eventCalls = 0
    ;(api.get as any).mockImplementation((path: string) => {
      if (path.includes('/metadata')) return Promise.resolve(metadataResponse())
      eventCalls += 1
      return Promise.resolve(
        mockEventsResponse({ pagination: { page: 0, per_page: 50, total: 200, pages: 4 } })
      )
    })
    renderHistory('proj-1')
    await screen.findByText('Member added')
    const callsBeforePageSizeChanges = eventCalls

    const perPageTrigger = document.getElementById('per-page') as HTMLElement
    await userEvent.click(perPageTrigger)
    await userEvent.click(await screen.findByText('20 items'))
    await userEvent.click(document.getElementById('per-page') as HTMLElement)
    await userEvent.click(await screen.findByText('100 items'))

    // Each onPaginationChange call already issues its own loadEvents; the perPage effect
    // must not additionally swallow or duplicate either reload.
    expect(eventCalls).toBeGreaterThanOrEqual(callsBeforePageSizeChanges + 2)
    const lastCall = (api.get as any).mock.calls.at(-1)
    expect(lastCall[1].params.limit).toBe('100')
  })

  it('retries both the events and metadata requests when both have failed', async () => {
    let metadataCalls = 0
    let eventCalls = 0
    ;(api.get as any).mockImplementation((path: string) => {
      if (path.includes('/metadata')) {
        metadataCalls += 1
        return Promise.reject(new Error('metadata down'))
      }
      eventCalls += 1
      return Promise.reject(new Error('events down'))
    })
    renderHistory('proj-1')
    expect(await screen.findByText(/down/i)).toBeInTheDocument()
    expect(metadataCalls).toBe(1)
    expect(eventCalls).toBe(1)

    await userEvent.click(screen.getByRole('button', { name: /retry/i }))
    await screen.findByText(/down/i)
    expect(metadataCalls).toBe(2)
    expect(eventCalls).toBe(2)
  })

  it('fires exactly one events-endpoint request on mount, before any user interaction', async () => {
    let eventCalls = 0
    ;(api.get as any).mockImplementation((path: string) => {
      if (path.includes('/metadata')) return Promise.resolve(metadataResponse())
      eventCalls += 1
      return Promise.resolve(mockEventsResponse())
    })
    renderHistory('proj-1')
    await screen.findByText('Member added')

    expect(eventCalls).toBe(1)
  })
})

describe('ProjectActivityHistoryModal — expanded row reset', () => {
  function metadataResponse(overrides = {}) {
    return {
      json: async () => ({
        categories: ['Budget', 'Members', 'Settings', 'Account'],
        domains: [],
        event_types: [],
        recording_enabled: true,
        ...overrides,
      }),
    }
  }

  it('collapses a previously expanded row when a filter change loads a new events page', async () => {
    ;(api.get as any).mockImplementation((path: string) =>
      path.includes('/metadata') ? metadataResponse() : mockEventsResponse()
    )
    renderHistory('proj-1')
    await screen.findByText('Member added')

    await userEvent.click(screen.getByRole('button', { name: /expand/i }))
    expect(await screen.findByText('viewer')).toBeInTheDocument()

    // Change sort direction to trigger a filter change
    const sortSelect = screen
      .getAllByText('Newest first')
      .find((el) => !el.closest('.p-hidden-accessible'))!
    await userEvent.click(sortSelect)
    await userEvent.click(await screen.findByText('Oldest first'))
    await screen.findByText('Member added')
    expect(screen.queryByText('viewer')).not.toBeInTheDocument()
  })

  it('collapses a previously expanded row when a page-size change loads a new events page', async () => {
    ;(api.get as any).mockImplementation((path: string) =>
      path.includes('/metadata')
        ? metadataResponse()
        : mockEventsResponse({ pagination: { page: 0, per_page: 50, total: 200, pages: 4 } })
    )
    renderHistory('proj-1')
    await screen.findByText('Member added')

    await userEvent.click(screen.getByRole('button', { name: /expand/i }))
    expect(await screen.findByText('viewer')).toBeInTheDocument()

    const perPageTrigger = document.getElementById('per-page') as HTMLElement
    await userEvent.click(perPageTrigger)
    await userEvent.click(await screen.findByText('100 items'))
    await screen.findByText('Member added')
    expect(screen.queryByText('viewer')).not.toBeInTheDocument()
  })
})

describe('ProjectActivityHistoryModal — modal layout for bounded scroll', () => {
  it('modal body content wrapper is a flex column with overflow-hidden so the Table can scroll internally', async () => {
    ;(api.get as any).mockImplementation((path: string) =>
      path.includes('/metadata')
        ? {
            json: async () => ({
              categories: ['Budget', 'Members', 'Settings', 'Account'],
              domains: [],
              event_types: [],
              recording_enabled: true,
            }),
          }
        : mockEventsResponse()
    )
    renderHistory('proj-1')
    await screen.findByText('Member added')

    // The popup body (p-dialog-content) must be a bounded flex column so the Table
    // with flex-1/min-h-0 fills only its share of the modal height.
    const dialogContent = document.querySelector('.p-dialog-content')
    expect(dialogContent).toBeInTheDocument()
    expect(dialogContent).toHaveClass('overflow-hidden')
    expect(dialogContent).toHaveClass('flex')
    expect(dialogContent).toHaveClass('flex-col')
  })

  it('inner wrapper div is flex-1 min-h-0 so it fills the dialog body and bounds the Table', async () => {
    ;(api.get as any).mockImplementation((path: string) =>
      path.includes('/metadata')
        ? {
            json: async () => ({
              categories: ['Budget', 'Members', 'Settings', 'Account'],
              domains: [],
              event_types: [],
              recording_enabled: true,
            }),
          }
        : mockEventsResponse()
    )
    renderHistory('proj-1')
    await screen.findByText('Member added')

    // The wrapper div that holds filters + Table must be flex-1 min-h-0 to bound the
    // Table's height to the available space in the dialog body.
    const innerWrapper = document.querySelector('.flex.flex-col.gap-4')
    expect(innerWrapper).toBeInTheDocument()
    expect(innerWrapper).toHaveClass('flex-1')
    expect(innerWrapper).toHaveClass('min-h-0')
  })
})

describe('ProjectActivityHistoryModal — unmount safety', () => {
  it('does not warn or throw when an in-flight listEvents request resolves after unmount', async () => {
    let resolveEvents: (value: unknown) => void
    const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {})
    ;(api.get as any).mockImplementation((path: string) =>
      path.includes('/metadata')
        ? Promise.resolve({
            json: async () => ({
              categories: ['Budget', 'Members', 'Settings', 'Account'],
              domains: [],
              event_types: [],
              recording_enabled: true,
            }),
          })
        : new Promise((resolve) => {
            resolveEvents = resolve
          })
    )
    const { unmount } = renderHistory('proj-1')
    await screen.findByText(/filter by actor/i)

    unmount()

    // Resolving after unmount must not throw.
    await act(async () => {
      resolveEvents!(mockEventsResponse())
      await new Promise((resolve) => {
        setTimeout(resolve, 0)
      })
    })

    expect(screen.queryByText('Member added')).not.toBeInTheDocument()
    const unmountedWarning = consoleErrorSpy.mock.calls.find((call) =>
      String(call[0]).includes('unmounted')
    )
    expect(unmountedWarning).toBeUndefined()
    consoleErrorSpy.mockRestore()
  })
})
