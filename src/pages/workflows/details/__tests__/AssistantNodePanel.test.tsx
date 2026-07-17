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

import AssistantNodePanel from '../AssistantNodePanel'

import type { UseAssistantForNodeResult } from '../../hooks/useAssistantForNode'

const mockUseAssistantForNode = vi.fn()

vi.mock('../../hooks/useAssistantForNode', () => ({
  useAssistantForNode: (...args: unknown[]) => mockUseAssistantForNode(...args),
}))

vi.mock('@/pages/assistants/components/AssistantDetails/AssistantDetailsEmbedded', () => ({
  default: () => <div data-testid="assistant-details">AssistantDetailsEmbedded</div>,
}))

vi.mock('@/components/Spinner', () => ({
  default: () => <div data-testid="spinner">Spinner</div>,
}))

const baseResult: UseAssistantForNodeResult = {
  assistant: undefined,
  isLoading: false,
  isForbidden: false,
  notFound: false,
  loadFailed: false,
  loadAssistant: vi.fn(),
  onNewIntegration: vi.fn(),
  newIntegrationPopup: null,
}

const setup = (override: Partial<UseAssistantForNodeResult>) => {
  mockUseAssistantForNode.mockReturnValue({ ...baseResult, ...override })
  return render(<AssistantNodePanel assistantId="a-1" onClose={vi.fn()} />)
}

describe('AssistantNodePanel', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('shows a spinner while loading (no blank frame)', () => {
    const { queryByTestId } = setup({ isLoading: true })
    expect(queryByTestId('spinner')).not.toBeNull()
    expect(queryByTestId('assistant-details')).toBeNull()
  })

  it('shows the no-access message on 403', () => {
    const { getByText, queryByTestId } = setup({ isForbidden: true })
    expect(getByText(/don't have access/i)).toBeTruthy()
    expect(queryByTestId('assistant-details')).toBeNull()
  })

  it('shows a distinct not-found message on 404 (not the no-access copy)', () => {
    const { getByText, queryByText } = setup({ notFound: true })
    expect(getByText(/no longer exists/i)).toBeTruthy()
    expect(queryByText(/don't have access/i)).toBeNull()
  })

  it('shows a retryable generic error on other failures', () => {
    const { getByText } = setup({ loadFailed: true })
    expect(getByText(/couldn't load this assistant/i)).toBeTruthy()
    expect(getByText(/retry/i)).toBeTruthy()
  })

  it('renders the embedded assistant view once loaded', () => {
    const { queryByTestId } = setup({ assistant: { id: 'a-1' } as never })
    expect(queryByTestId('assistant-details')).not.toBeNull()
  })
})
