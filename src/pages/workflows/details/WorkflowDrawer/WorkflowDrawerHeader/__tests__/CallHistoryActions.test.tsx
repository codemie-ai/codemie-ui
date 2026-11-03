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
import { beforeEach, describe, expect, it, vi } from 'vitest'

import { downloadCodeAsFile } from '@/components/CodeBlock/fileExtensions'
import { workflowExecutionsStore } from '@/store/workflowExecutions'
import { WorkflowExecutionState } from '@/types/entity'
import { copyTextToClipboard } from '@/utils/helpers'
import toaster from '@/utils/toaster'

import CallHistoryActions from '../CallHistoryActions'

vi.mock('@/store/workflowExecutions', async () => {
  const { proxy } = await import('valtio')
  return {
    workflowExecutionsStore: proxy({
      executionStatesThoughts: [] as any[],
      getStateThought: vi.fn(),
    }),
  }
})
vi.mock('@/components/CodeBlock/fileExtensions', () => ({ downloadCodeAsFile: vi.fn() }))
vi.mock('@/utils/helpers', () => ({ copyTextToClipboard: vi.fn() }))
vi.mock('@/utils/toaster', () => ({
  default: { success: vi.fn(), info: vi.fn(), error: vi.fn() },
}))

const makeState = (thoughts: any[]) =>
  ({
    id: 's1',
    execution_id: 'e1',
    name: 'Node A',
    status: 'Succeeded',
    started_at: null,
    completed_at: null,
    thoughts,
  } as unknown as WorkflowExecutionState)

const store = workflowExecutionsStore as any

describe('CallHistoryActions', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    store.executionStatesThoughts = [{ id: 't1', message: 'm-t1', in_progress: false }]
    store.getStateThought.mockImplementation((id: string) => ({
      id,
      message: 'm-' + id,
      in_progress: false,
    }))
  })

  it('copies formatted JSON and shows success toast', async () => {
    vi.mocked(copyTextToClipboard).mockResolvedValue(true)
    render(<CallHistoryActions state={makeState([{ id: 't1' }])} />)
    fireEvent.click(screen.getByRole('button', { name: /copy to clipboard/i }))
    await waitFor(() =>
      expect(toaster.success).toHaveBeenCalledWith('Call history copied to clipboard')
    )
    const text = vi.mocked(copyTextToClipboard).mock.calls[0][0]
    expect(text).toContain('Node A')
    expect(text).toContain('Succeeded')
    expect(text).toContain('t1')
  })

  it('shows error toast when clipboard fails', async () => {
    vi.mocked(copyTextToClipboard).mockResolvedValue(false)
    render(<CallHistoryActions state={makeState([{ id: 't1' }])} />)
    fireEvent.click(screen.getByRole('button', { name: /copy to clipboard/i }))
    await waitFor(() => expect(toaster.error).toHaveBeenCalled())
    expect(toaster.success).not.toHaveBeenCalled()
  })

  it('downloads json and shows success toast', () => {
    render(<CallHistoryActions state={makeState([{ id: 't1' }])} />)
    fireEvent.click(screen.getByRole('button', { name: /download/i }))
    expect(downloadCodeAsFile).toHaveBeenCalledWith(expect.any(String), 'json', expect.any(String))
    expect(toaster.success).toHaveBeenCalledWith('Call history downloaded')
  })

  it('shows error toast when download throws', () => {
    vi.mocked(downloadCodeAsFile).mockImplementation(() => {
      throw new Error('x')
    })
    render(<CallHistoryActions state={makeState([{ id: 't1' }])} />)
    fireEvent.click(screen.getByRole('button', { name: /download/i }))
    expect(toaster.error).toHaveBeenCalledWith('Could not download call history. Please try again.')
  })

  it('shows info toast when no thought data can be exported', () => {
    store.getStateThought.mockReturnValue(undefined)
    render(<CallHistoryActions state={makeState([{ id: 't1' }])} />)
    fireEvent.click(screen.getByRole('button', { name: /download/i }))
    expect(toaster.info).toHaveBeenCalledWith('No call history records to export')
    expect(downloadCodeAsFile).not.toHaveBeenCalled()
    expect(copyTextToClipboard).not.toHaveBeenCalled()
  })

  it('renders no buttons when there are no thoughts', () => {
    render(<CallHistoryActions state={makeState([])} />)
    expect(screen.queryByRole('button', { name: /download/i })).toBeNull()
  })

  it('renders buttons only once thoughts are loaded into the store', () => {
    store.executionStatesThoughts = []
    const state = makeState([{ id: 't1' }])
    const { rerender } = render(<CallHistoryActions state={state} />)
    expect(screen.queryByRole('button', { name: /download/i })).toBeNull()

    store.executionStatesThoughts = [{ id: 't1', message: 'm-t1', in_progress: false }]
    rerender(<CallHistoryActions state={state} />)
    expect(screen.getByRole('button', { name: /download/i })).toBeTruthy()
  })
})
