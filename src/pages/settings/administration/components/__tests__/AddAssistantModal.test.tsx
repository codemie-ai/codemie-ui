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

import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { describe, expect, it, vi, beforeEach } from 'vitest'

const mockAddMapping = vi.fn()

vi.mock('@/store/assistantsProjectMapping', () => ({
  assistantsProjectMappingStore: {
    addMapping: mockAddMapping,
  },
}))

vi.mock('@/utils/toaster', () => ({
  default: { info: vi.fn(), error: vi.fn() },
}))

vi.mock('@/pages/assistants/components/AssistantSelector', () => ({
  default: ({ onChange }: { onChange: (val: any[]) => void }) => (
    <button
      data-testid="mock-assistant-selector"
      onClick={() => onChange([{ id: 'selected-assistant-id', name: 'My Bot' }])}
    >
      Select Assistant
    </button>
  ),
}))

describe('AddAssistantModal', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockAddMapping.mockResolvedValue(undefined)
  })

  it('renders selector and action buttons', async () => {
    const { default: AddAssistantModal } = await import('../AddAssistantModal')
    render(<AddAssistantModal projectName="my-project" onClose={vi.fn()} />)
    expect(screen.getByTestId('mock-assistant-selector')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /add/i })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /cancel/i })).toBeInTheDocument()
  })

  it('calls addMapping with selected assistant id on confirm', async () => {
    const onClose = vi.fn()
    const toaster = (await import('@/utils/toaster')).default
    const { default: AddAssistantModal } = await import('../AddAssistantModal')
    render(<AddAssistantModal projectName="my-project" onClose={onClose} />)

    fireEvent.click(screen.getByTestId('mock-assistant-selector'))
    fireEvent.click(screen.getByRole('button', { name: /add/i }))

    await waitFor(() => {
      expect(mockAddMapping).toHaveBeenCalledWith('selected-assistant-id', 'my-project')
      expect(toaster.info).toHaveBeenCalledWith('Assistant added')
      expect(onClose).toHaveBeenCalled()
    })
  })

  it('calls onClose when Cancel is clicked', async () => {
    const onClose = vi.fn()
    const { default: AddAssistantModal } = await import('../AddAssistantModal')
    render(<AddAssistantModal projectName="my-project" onClose={onClose} />)
    fireEvent.click(screen.getByRole('button', { name: /cancel/i }))
    expect(onClose).toHaveBeenCalled()
  })

  it('shows error toast and keeps modal open on addMapping failure', async () => {
    mockAddMapping.mockRejectedValue(new Error('API error'))
    const toaster = (await import('@/utils/toaster')).default
    const onClose = vi.fn()
    const { default: AddAssistantModal } = await import('../AddAssistantModal')
    render(<AddAssistantModal projectName="my-project" onClose={onClose} />)

    fireEvent.click(screen.getByTestId('mock-assistant-selector'))
    fireEvent.click(screen.getByRole('button', { name: /add/i }))

    await waitFor(() => {
      expect(toaster.error).toHaveBeenCalled()
      expect(onClose).not.toHaveBeenCalled()
    })
  })

  it('shows "Assistant not found" toast for 404 errors', async () => {
    const err: any = new Error('Not found')
    err.response = { status: 404 }
    mockAddMapping.mockRejectedValue(err)
    const toaster = (await import('@/utils/toaster')).default
    const onClose = vi.fn()
    const { default: AddAssistantModal } = await import('../AddAssistantModal')
    render(<AddAssistantModal projectName="my-project" onClose={onClose} />)
    fireEvent.click(screen.getByTestId('mock-assistant-selector'))
    fireEvent.click(screen.getByRole('button', { name: /add/i }))
    await waitFor(() => {
      expect(toaster.error).toHaveBeenCalledWith('Assistant not found')
      expect(onClose).not.toHaveBeenCalled()
    })
  })
})
