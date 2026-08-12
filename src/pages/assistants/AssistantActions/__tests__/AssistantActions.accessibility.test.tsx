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

import { render, screen } from '@testing-library/react'
import { describe, it, expect, vi } from 'vitest'

import AssistantActions from '../AssistantActions'

vi.mock('@/hooks/useVueRouter', () => ({ useVueRouter: () => ({ push: vi.fn() }) }))
vi.mock('valtio', async (orig) => {
  const actual = await orig<typeof import('valtio')>()
  return { ...actual, useSnapshot: () => ({}) }
})
vi.mock('@/store/assistants', () => ({ assistantsStore: {} }))
vi.mock('@/assets/icons/navigation-more.svg?react', () => ({ default: () => <span /> }))
vi.mock('@/assets/icons/chat-new-filled.svg?react', () => ({ default: () => <span /> }))
vi.mock('@/assets/icons/clone.svg?react', () => ({ default: () => <span /> }))
vi.mock('@/assets/icons/delete.svg?react', () => ({ default: () => <span /> }))
vi.mock('@/assets/icons/edit.svg?react', () => ({ default: () => <span /> }))
vi.mock('@/assets/icons/info.svg?react', () => ({ default: () => <span /> }))
vi.mock('@/assets/icons/publish.svg?react', () => ({ default: () => <span /> }))
vi.mock('@/assets/icons/unpublish.svg?react', () => ({ default: () => <span /> }))
vi.mock('@/components/ConfirmationModal', () => ({ default: () => null }))

const makeAssistant = (overrides: Record<string, unknown> = {}) => ({
  id: 'asst-1',
  name: 'My Assistant',
  slug: 'my-assistant',
  description: '',
  type: undefined,
  is_global: false,
  shared: false,
  created_at: '2026-01-01T00:00:00Z',
  updated_at: '2026-01-01T00:00:00Z',
  system_prompt: '',
  llm_model_type: 'default',
  mcp_servers: [],
  system_prompt_history: [],
  guardrail_assignments: [],
  created_by: { id: 'u1', name: 'User', email: 'u1@test.com', username: 'u1' },
  ...overrides,
})

describe('AssistantActions accessibility (contextId via sr-only span)', () => {
  it('More Options button compound name includes assistant name', () => {
    render(<AssistantActions assistant={makeAssistant()} />)
    expect(screen.getByRole('button', { name: /^More options My Assistant$/ })).toBeInTheDocument()
  })

  it('trigger uses aria-labelledby (not aria-label) when contextId set', () => {
    render(<AssistantActions assistant={makeAssistant()} />)
    const trigger = screen.getByRole('button', { name: /^More options My Assistant$/ })
    expect(trigger).toHaveAttribute('aria-labelledby')
    expect(trigger).not.toHaveAttribute('aria-label')
  })

  it('aria-labelledby references sr-only span with assistant name', () => {
    render(<AssistantActions assistant={makeAssistant({ id: 'asst-42', name: 'Alpha Bot' })} />)
    const trigger = screen.getByRole('button', { name: /^More options Alpha Bot$/ })
    const parts = trigger.getAttribute('aria-labelledby')!.split(/\s+/)
    expect(parts).toHaveLength(2)
    expect(document.getElementById(parts[1])).toHaveTextContent('Alpha Bot')
  })
})
