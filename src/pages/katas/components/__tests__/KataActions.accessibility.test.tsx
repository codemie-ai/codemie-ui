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

import KataActions from '../KataActions'

vi.mock('@/hooks/useVueRouter', () => ({ useVueRouter: () => ({ push: vi.fn() }) }))
vi.mock('valtio', async (orig) => {
  const actual = await orig<typeof import('valtio')>()
  return { ...actual, useSnapshot: () => ({}) }
})
vi.mock('@/store/katas', () => ({ katasStore: {} }))
vi.mock('@/assets/icons/navigation-more.svg?react', () => ({ default: () => <span /> }))
vi.mock('@/assets/icons/edit.svg?react', () => ({ default: () => <span /> }))
vi.mock('@/assets/icons/delete.svg?react', () => ({ default: () => <span /> }))
vi.mock('@/assets/icons/publish.svg?react', () => ({ default: () => <span /> }))
vi.mock('@/assets/icons/unpublish.svg?react', () => ({ default: () => <span /> }))
vi.mock('@/assets/icons/clone.svg?react', () => ({ default: () => <span /> }))
vi.mock('@/utils/toaster', () => ({ default: { info: vi.fn(), error: vi.fn() } }))
vi.mock('../UnpublishKataConfirmation', () => ({ default: () => null }))
vi.mock('../ArchiveKataConfirmation', () => ({ default: () => null }))

const makeKata = (overrides: Record<string, unknown> = {}) => ({
  id: 'kata-1',
  title: 'My Kata',
  description: '',
  level: 'beginner',
  duration_minutes: 30,
  tags: [],
  status: 'draft',
  is_published: false,
  date: '2026-01-01T00:00:00Z',
  unique_likes_count: 0,
  unique_dislikes_count: 0,
  user_progress: { status: 'not_started', progress: 0 },
  enrollment_count: 0,
  user_abilities: ['admin'],
  ...overrides,
})

describe('KataActions accessibility (contextId via sr-only span)', () => {
  it('More Options button compound name includes kata title', () => {
    render(<KataActions kata={makeKata() as any} isAdmin />)
    expect(screen.getByRole('button', { name: /^More options My Kata$/ })).toBeInTheDocument()
  })

  it('trigger uses aria-labelledby (not aria-label) when contextId set', () => {
    render(<KataActions kata={makeKata() as any} isAdmin />)
    const trigger = screen.getByRole('button', { name: /^More options My Kata$/ })
    expect(trigger).toHaveAttribute('aria-labelledby')
    expect(trigger).not.toHaveAttribute('aria-label')
  })

  it('aria-labelledby references sr-only span with kata title', () => {
    render(
      <KataActions kata={makeKata({ id: 'kata-99', title: 'Advanced Kata' }) as any} isAdmin />
    )
    const trigger = screen.getByRole('button', { name: /^More options Advanced Kata$/ })
    const parts = trigger.getAttribute('aria-labelledby')!.split(/\s+/)
    expect(document.getElementById(parts[1])).toHaveTextContent('Advanced Kata')
  })
})
