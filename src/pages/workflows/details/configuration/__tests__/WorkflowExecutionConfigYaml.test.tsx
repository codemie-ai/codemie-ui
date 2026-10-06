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

import { render, screen, fireEvent, within } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'

import { Workflow } from '@/types/entity/workflow'

import WorkflowExecutionConfigYaml from '../WorkflowExecutionConfigYaml'

vi.mock('@/assets/icons/edit.svg?react', () => ({ default: () => null }))
vi.mock('@/assets/icons/copy.svg?react', () => ({ default: () => null }))
vi.mock('@/assets/icons/download.svg?react', () => ({ default: () => null }))
vi.mock('@/assets/icons/expand.svg?react', () => ({ default: () => null }))
vi.mock('@/assets/icons/view.svg?react', () => ({ default: () => null }))

vi.mock('@/hooks/useVueRouter', () => ({
  useVueRouter: () => ({ push: vi.fn() }),
}))

const yamlConfig = 'states:\n  - id: first_state\n    assistant_id: helper'

const workflow: Workflow = {
  id: 'wf-1',
  name: 'My Workflow',
  slug: 'my-workflow',
  yaml_config: yamlConfig,
  yaml_config_history: [],
  update_date: '2026-01-01T00:00:00Z',
  user_abilities: ['read'],
}

const openExpanded = () => {
  render(<WorkflowExecutionConfigYaml workflow={workflow} />)
  fireEvent.click(screen.getByRole('button', { name: 'Expand' }))
  return screen.getByRole('dialog')
}

describe('WorkflowExecutionConfigYaml expand', () => {
  it('opens a Configuration dialog that shows the same YAML text', () => {
    const dialog = openExpanded()

    expect(within(dialog).getByText('Configuration')).toBeInTheDocument()
    expect(dialog.querySelector('code')?.textContent).toBe(yamlConfig)
  })

  it('renders the expanded YAML read-only', () => {
    const dialog = openExpanded()

    expect(within(dialog).queryByRole('textbox')).not.toBeInTheDocument()
    expect(dialog.querySelector('textarea, input, [contenteditable="true"]')).toBeNull()
  })

  it('offers Copy and Download inside the dialog', () => {
    const dialog = openExpanded()

    expect(within(dialog).getByRole('button', { name: /Copy/ })).toBeInTheDocument()
    expect(within(dialog).getByRole('button', { name: /Download/ })).toBeInTheDocument()
  })
})
