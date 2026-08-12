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

// Tests the accessibility wiring of ProjectSettingActionsCell exported from ProjectSettings.tsx
// Uses the component rendered alongside a span that carries the alias id,
// mirroring what the parent table renders via customTableColumns.alias.

import { render, screen } from '@testing-library/react'
import { describe, it, expect, vi } from 'vitest'

import { ProjectSettingActionsCell } from '../ProjectSettings'

vi.mock('@/assets/icons/navigation-more.svg?react', () => ({ default: () => <span /> }))
vi.mock('@/assets/icons/edit.svg?react', () => ({ default: () => <span /> }))
vi.mock('@/assets/icons/delete.svg?react', () => ({ default: () => <span /> }))
vi.mock('@/components/TestIntegration', () => ({ default: () => null }))
vi.mock('../TestIntegration', () => ({ default: () => null }))
vi.mock('../integrations/ProjectSettings/TestIntegration', () => ({ default: () => null }))
vi.mock('@/utils/utils', async (orig) => ({
  ...(await orig<object>()),
  getTestableCredentialTypes: () => [],
}))
vi.mock('../../../utils/integrations', () => ({
  getTestableCredentialTypes: () => [],
  getSettingCredsURL: () => '',
}))

const makeItem = (overrides: Record<string, unknown> = {}) => ({
  id: 'ps-1',
  alias: 'my-github',
  credential_type: 'github',
  credential_values: [],
  is_enabled: true,
  ...overrides,
})

describe('ProjectSettingActionsCell accessibility (contextId pattern)', () => {
  it('More Options button references the alias cell span via aria-labelledby', () => {
    render(
      <div>
        <span id="project-setting-name-ps-1">my-github</span>
        <ProjectSettingActionsCell item={makeItem() as any} onEdit={vi.fn()} onDelete={vi.fn()} />
      </div>
    )
    const btn = screen.getByRole('button', { name: 'More options my-github' })
    expect(btn).toBeInTheDocument()
    expect(btn).not.toHaveAttribute('aria-label')
    const parts = btn.getAttribute('aria-labelledby')!.split(/\s+/)
    expect(document.getElementById(parts[1])).toHaveTextContent('my-github')
  })
})
