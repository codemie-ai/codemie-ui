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

import { act, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import { assistantsStore } from '@/store/assistants'
import api from '@/utils/api'
import toaster from '@/utils/toaster'

import {
  HostedCategoriesNotice,
  resetHostedCategoriesRequest,
  useHostedCategories,
} from '../useHostedCategories'

vi.mock('@/utils/api', () => ({ default: { get: vi.fn() } }))
vi.mock('@/utils/toaster', () => ({
  default: { success: vi.fn(), error: vi.fn(), info: vi.fn() },
}))

const CATEGORIES = [{ id: 'c1', name: 'Dev', description: '' }]
const ok = () => Promise.resolve({ json: () => Promise.resolve(CATEGORIES) })

const Probe = ({ id }: { id: string }) => {
  const { categories, status, retry } = useHostedCategories()
  return (
    <div>
      <span data-testid={`status-${id}`}>{status}</span>
      <span data-testid={`count-${id}`}>{categories.length}</span>
      <HostedCategoriesNotice status={status} retry={retry} />
    </div>
  )
}

describe('useHostedCategories', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    resetHostedCategoriesRequest()
    assistantsStore.assistantCategories = []
  })

  it('makes one request for two hooks mounted together', async () => {
    vi.mocked(api.get).mockImplementation(ok as any)
    render(
      <>
        <Probe id="a" />
        <Probe id="b" />
      </>
    )
    await waitFor(() => expect(screen.getByTestId('status-a').textContent).toBe('ready'))
    expect(screen.getByTestId('status-b').textContent).toBe('ready')
    expect(api.get).toHaveBeenCalledTimes(1)
    expect(screen.getByTestId('count-a').textContent).toBe('1')
  })

  it('makes no request when categories are already loaded', () => {
    assistantsStore.assistantCategories = CATEGORIES
    render(<Probe id="a" />)
    expect(screen.getByTestId('status-a').textContent).toBe('ready')
    expect(api.get).not.toHaveBeenCalled()
  })

  it('reports failure without a toast and recovers on Retry', async () => {
    vi.mocked(api.get).mockImplementationOnce(() => Promise.reject(new Error('boom')))
    render(<Probe id="a" />)
    await waitFor(() => expect(screen.getByTestId('status-a').textContent).toBe('failed'))
    expect(screen.getByRole('alert').textContent).toContain('Categories could not be loaded')
    expect(toaster.error).not.toHaveBeenCalled()
    expect(vi.mocked(api.get).mock.calls[0][1]).toEqual({ skipErrorHandling: true })

    vi.mocked(api.get).mockImplementation(ok as any)
    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: /retry/i }))
    })
    await waitFor(() => expect(screen.getByTestId('status-a').textContent).toBe('ready'))
    expect(api.get).toHaveBeenCalledTimes(2)
    expect(screen.queryByRole('alert')).toBeNull()
  })
})
