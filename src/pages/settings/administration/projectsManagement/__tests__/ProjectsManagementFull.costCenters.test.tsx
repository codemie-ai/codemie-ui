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

import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { useState } from 'react'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import CostCenterFilter from '../components/CostCenterFilter'

const mockGet = vi.fn()
vi.mock('@/utils/api', () => ({
  default: {
    get: (...args: unknown[]) => mockGet(...args),
  },
}))

const costCenters = [
  { id: '11111111-1111-4111-8111-111111111111', name: 'eng-ops' },
  { id: '22222222-2222-4222-8222-222222222222', name: 'fin-ops' },
]

const listResponse = (names: string[]) => ({
  json: async () => ({
    data: costCenters
      .filter(({ name }) => names.includes(name))
      .map(({ id, name }) => ({ id, name, project_count: 1 })),
    pagination: { page: 0, per_page: 20, total: names.length, pages: 1 },
  }),
})

describe('CostCenterFilter', () => {
  beforeEach(() => {
    mockGet.mockReset()
    mockGet.mockImplementation((_: string, options: { params?: { search?: string } }) => {
      const search = options?.params?.search ?? ''
      const names = ['eng-ops', 'fin-ops'].filter((name) => !search || name.startsWith(search))
      return Promise.resolve(listResponse(names))
    })
  })

  it('loads named options and allows a searched multi-select selection', async () => {
    const user = userEvent.setup()
    const onChange = vi.fn()
    render(<CostCenterFilter value={[]} onChange={onChange} />)

    fireEvent.click(screen.getByRole('combobox', { name: /cost center/i }))
    await screen.findByText('eng-ops')
    await user.click(screen.getByText('eng-ops'))
    expect(onChange).toHaveBeenCalledWith(['11111111-1111-4111-8111-111111111111'])

    fireEvent.change(screen.getByPlaceholderText('Search cost centers'), {
      target: { value: 'missing' },
    })
    await waitFor(() =>
      expect(mockGet).toHaveBeenCalledWith('v1/admin/cost-centers', {
        params: { search: 'missing', page: 0, per_page: 20 },
      })
    )
    expect(await screen.findByText('No cost centers match your search')).toBeInTheDocument()
  })

  it('accumulates multiple selections instead of replacing the previous one', async () => {
    const user = userEvent.setup()
    const onChange = vi.fn()
    const Harness = () => {
      const [ids, setIds] = useState<string[]>([])
      return (
        <CostCenterFilter
          value={ids}
          onChange={(next) => {
            onChange(next)
            setIds(next)
          }}
        />
      )
    }
    render(<Harness />)

    fireEvent.click(screen.getByRole('combobox', { name: /cost center/i }))
    await user.click(await screen.findByText('eng-ops'))
    await user.click(screen.getByText('fin-ops'))

    expect(onChange).toHaveBeenLastCalledWith([
      '11111111-1111-4111-8111-111111111111',
      '22222222-2222-4222-8222-222222222222',
    ])
  })

  it('shows selected cost center names as a comma-separated value and clears all selections', async () => {
    const user = userEvent.setup()
    const onChange = vi.fn()
    const selected = costCenters.map(({ id }) => id)
    mockGet.mockImplementation((url: string, options: { params?: { search?: string } }) => {
      const selectedCenter = costCenters.find(({ id }) => url.endsWith(id))
      if (selectedCenter) return Promise.resolve({ json: async () => selectedCenter })
      const search = options?.params?.search ?? ''
      const names = ['eng-ops', 'fin-ops'].filter((name) => !search || name.startsWith(search))
      return Promise.resolve(listResponse(names))
    })
    render(<CostCenterFilter value={selected} onChange={onChange} />)

    const input = screen.getByRole('combobox', { name: /cost center/i })
    await waitFor(() => expect(input).toHaveValue('eng-ops, fin-ops'))
    await user.click(document.querySelector('.multiselect-clear svg')!)
    expect(onChange).toHaveBeenCalledWith([])
  })

  it('resolves the label for a selected cost center outside the loaded page', async () => {
    const selectedId = '33333333-3333-4333-8333-333333333333'
    mockGet.mockImplementation((url: string, options: { params?: { search?: string } }) => {
      if (url.endsWith(selectedId)) {
        return Promise.resolve({
          json: async () => ({ id: selectedId, name: 'security-ops' }),
        })
      }
      const search = options?.params?.search ?? ''
      const names = ['eng-ops', 'fin-ops'].filter((name) => !search || name.startsWith(search))
      return Promise.resolve(listResponse(names))
    })
    render(<CostCenterFilter value={[selectedId]} onChange={vi.fn()} />)

    await waitFor(() =>
      expect(screen.getByRole('combobox', { name: /cost center/i })).toHaveValue('security-ops')
    )
  })

  it('drops a deleted cost center from the current selection when its lookup settles late', async () => {
    const deletedId = '44444444-4444-4444-8444-444444444444'
    let rejectLookup: (reason: unknown) => void = () => undefined
    const lookup = new Promise<never>((_, reject) => {
      rejectLookup = reject
    })
    mockGet.mockImplementation((url: string) =>
      url.endsWith(deletedId) ? lookup : Promise.resolve(listResponse(['eng-ops']))
    )
    const onChange = vi.fn()
    const { rerender } = render(<CostCenterFilter value={[deletedId]} onChange={onChange} />)
    await waitFor(() =>
      expect(mockGet).toHaveBeenCalledWith(expect.stringContaining(deletedId), expect.anything())
    )

    // A parent re-render passes a fresh array while the lookup is still in flight.
    rerender(<CostCenterFilter value={[deletedId]} onChange={onChange} />)
    rejectLookup({ status: 404 })

    await waitFor(() => expect(onChange).toHaveBeenCalledWith([]))
  })

  it('reports a failed options request and retries it on the next open', async () => {
    const user = userEvent.setup()
    mockGet.mockRejectedValueOnce(new Error('Network error'))
    render(<CostCenterFilter value={[]} onChange={vi.fn()} />)
    const input = screen.getByRole('combobox', { name: /cost center/i })

    fireEvent.click(input)
    expect(await screen.findByText('Failed to load cost centers')).toBeInTheDocument()

    await user.keyboard('{Escape}')
    await waitFor(() =>
      expect(screen.queryByText('Failed to load cost centers')).not.toBeInTheDocument()
    )
    fireEvent.click(input)

    expect(await screen.findByText('eng-ops')).toBeInTheDocument()
    expect(mockGet).toHaveBeenCalledTimes(2)
  })
})
