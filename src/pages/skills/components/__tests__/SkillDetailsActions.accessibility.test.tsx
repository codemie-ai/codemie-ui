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

import SkillDetailsActions from '../SkillDetailsActions'

vi.mock('@/assets/icons/navigation-more.svg?react', () => ({ default: () => <span /> }))
vi.mock('@/assets/icons/delete.svg?react', () => ({ default: () => <span /> }))
vi.mock('@/assets/icons/edit.svg?react', () => ({ default: () => <span /> }))
vi.mock('@/assets/icons/download.svg?react', () => ({ default: () => <span /> }))
vi.mock('@/assets/icons/copy-link.svg?react', () => ({ default: () => <span /> }))
vi.mock('@/assets/icons/publish.svg?react', () => ({ default: () => <span /> }))
vi.mock('@/assets/icons/unpublish.svg?react', () => ({ default: () => <span /> }))
vi.mock('@/components/ConfirmationModal', () => ({ default: () => null }))
vi.mock('@/components/Button', () => ({
  default: ({ children }: any) => <button>{children}</button>,
}))
vi.mock('@/hooks/useVueRouter', () => ({ useVueRouter: () => ({ push: vi.fn() }) }))
vi.mock('@/store/skills', () => ({ skillsStore: {} }))
vi.mock('@/utils/utils', async (orig) => ({ ...(await orig<object>()), copyToClipboard: vi.fn() }))
vi.mock('../PublishToMarketplaceModal', () => ({ default: () => null }))

const makeSkill = (overrides: Record<string, unknown> = {}) => ({
  id: 'skill-1',
  name: 'My Skill',
  visibility: 'private',
  created_by: { id: 'u1', name: 'User', email: 'u1@test.com', username: 'u1' },
  assistants_count: 0,
  ...overrides,
})

describe('SkillDetailsActions accessibility (contextId pattern)', () => {
  it('More Options button references the skill name heading via aria-labelledby', () => {
    render(
      <div>
        <h1 id="test-name-id">My Skill</h1>
        <SkillDetailsActions
          skill={makeSkill() as any}
          nameId="test-name-id"
          onExport={vi.fn()}
          exporting={false}
        />
      </div>
    )
    const btn = screen.getByRole('button', { name: /^More options My Skill$/ })
    expect(btn).toBeInTheDocument()
    expect(btn).not.toHaveAttribute('aria-label')
    const parts = btn.getAttribute('aria-labelledby')!.split(/\s+/)
    expect(document.getElementById(parts[1])).toHaveTextContent('My Skill')
  })
})
