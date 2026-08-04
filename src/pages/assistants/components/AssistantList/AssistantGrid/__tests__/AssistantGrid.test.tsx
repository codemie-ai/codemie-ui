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

import type { Assistant, AssistantTemplate } from '@/types/entity/assistant'

import AssistantGrid from '../AssistantGrid'

// @/router pulls in the entire page tree (katas → MarkdownEditor → react-syntax-highlighter,
// which crashes under this environment's ESM/CJS setup). Stub it directly.
vi.mock('@/router', () => ({ router: {} }))

vi.mock('@/pages/assistants/components/AssistantList/AssistantCard', () => ({
  default: () => <div data-testid="assistant-card" />,
}))

vi.mock('@/pages/assistants/components/AssistantList/AssistantCard/getAssistantCardInfo', () => ({
  getAssistantCardInfo: () => ({ description: '', isShared: false, isOwned: false, name: 'stub' }),
}))

vi.mock('@/pages/assistants/AssistantActions/AssistantActions', () => ({
  default: () => null,
}))

const baseProps = {
  assistants: [],
  assistantTemplates: [],
  user: null,
  showAssistant: vi.fn(),
  reloadAssistants: vi.fn(),
  totalCount: 0,
}

const stubAssistant = { id: '1', slug: 'a' } as unknown as Assistant
const stubTemplate = { id: '2', slug: 'b' } as unknown as AssistantTemplate

describe('AssistantGrid empty state', () => {
  it('shows "No assistants found." when isTemplate is false and the list is empty', () => {
    render(<AssistantGrid {...baseProps} isTemplate={false} />)
    expect(screen.getByText('No assistants found.')).toBeInTheDocument()
    expect(screen.queryByText('No templates found.')).toBeNull()
  })

  it('shows "No templates found." when isTemplate is true and the list is empty', () => {
    render(<AssistantGrid {...baseProps} isTemplate />)
    expect(screen.getByText('No templates found.')).toBeInTheDocument()
    expect(screen.queryByText('No assistants found.')).toBeNull()
  })
})

describe('AssistantGrid count heading', () => {
  it('renders the assistant count as a level-2 heading (plural)', () => {
    render(
      <AssistantGrid
        {...baseProps}
        assistants={[stubAssistant]}
        totalCount={5}
        isTemplate={false}
      />
    )
    expect(screen.getByRole('heading', { name: '5 ASSISTANTS', level: 2 })).toBeInTheDocument()
  })

  it('renders the singular assistant count as a level-2 heading', () => {
    render(
      <AssistantGrid
        {...baseProps}
        assistants={[stubAssistant]}
        totalCount={1}
        isTemplate={false}
      />
    )
    expect(screen.getByRole('heading', { name: '1 ASSISTANT', level: 2 })).toBeInTheDocument()
  })

  it('renders the template count as a level-2 heading', () => {
    render(
      <AssistantGrid {...baseProps} assistantTemplates={[stubTemplate]} totalCount={3} isTemplate />
    )
    expect(screen.getByRole('heading', { name: '3 TEMPLATES', level: 2 })).toBeInTheDocument()
  })

  it('does not render a count heading when totalCount is 0', () => {
    render(
      <AssistantGrid
        {...baseProps}
        assistants={[stubAssistant]}
        totalCount={0}
        isTemplate={false}
      />
    )
    expect(screen.queryByRole('heading', { level: 2 })).toBeNull()
  })
})
