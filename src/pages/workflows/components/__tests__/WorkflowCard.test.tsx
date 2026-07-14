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
import { describe, expect, it, vi } from 'vitest'

import WorkflowCard, { Workflow } from '../WorkflowCard'

// `@/router` pulls in the entire page tree (including katas -> MarkdownEditor ->
// react-syntax-highlighter, which crashes under this environment's ESM/CJS setup).
// It's only reachable transitively via useVueRouter.tsx; stub it directly so this
// test's module graph never touches that unrelated chain.
vi.mock('@/router', () => ({ router: {} }))

vi.mock('../WorkflowActions', () => ({
  default: () => null,
}))

vi.mock('../../details/popups/WorkflowStartExecutionPopup', () => ({
  default: () => null,
}))

const makeWorkflow = (overrides: Partial<Workflow> = {}): Workflow => ({
  id: '1',
  slug: 'test-workflow',
  name: 'Branch Comparison Workflow',
  description: 'Compares two branches',
  created_by: { name: 'Jane Doe' },
  ...overrides,
})

describe('WorkflowCard', () => {
  it('renders the workflow name as a level-3 heading', () => {
    render(<WorkflowCard workflow={makeWorkflow()} isTemplate />)

    const heading = screen.getByRole('heading', { level: 3, name: 'Branch Comparison Workflow' })
    expect(heading).toBeInTheDocument()
  })
})
