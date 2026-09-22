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
import { describe, expect, it } from 'vitest'

import { TOOLKITS } from '@/constants/assistants'
import { AssistantContext, AssistantToolkit, ContextType } from '@/types/entity/assistant'

import { GitDatasourceHint, isGitDatasourceMissing } from '../GitDatasourceHint'

const toolkit = (name: string, toolCount: number) =>
  ({
    toolkit: name,
    tools: Array.from({ length: toolCount }, (_, i) => ({ name: `tool_${i}` })),
  } as unknown as AssistantToolkit)

const context = (contextType: ContextType) =>
  ({ id: 'ds-1', name: 'ds', context_type: contextType } as AssistantContext)

describe('isGitDatasourceMissing', () => {
  it('is true when Git tools are selected and no CODE datasource is attached', () => {
    expect(isGitDatasourceMissing([toolkit(TOOLKITS.Git, 1)], [])).toBe(true)
    expect(
      isGitDatasourceMissing([toolkit(TOOLKITS.Git, 1)], [context(ContextType.KNOWLEDGE_BASE)])
    ).toBe(true)
  })

  it('is false when a CODE datasource is attached', () => {
    expect(isGitDatasourceMissing([toolkit(TOOLKITS.Git, 2)], [context(ContextType.CODE)])).toBe(
      false
    )
  })

  it('is false when the Git toolkit has no selected tools', () => {
    expect(isGitDatasourceMissing([toolkit(TOOLKITS.Git, 0)], [])).toBe(false)
  })

  it('is false when there is no Git toolkit', () => {
    expect(isGitDatasourceMissing([toolkit('Jira', 1)], [])).toBe(false)
  })

  it('is false when the context is not loaded yet', () => {
    expect(isGitDatasourceMissing([toolkit(TOOLKITS.Git, 1)], undefined)).toBe(false)
  })
})

describe('GitDatasourceHint', () => {
  it('renders the warning badge without the state dot', () => {
    render(<GitDatasourceHint />)
    const badge = screen.getByRole('status')
    expect(badge).toHaveTextContent('Git datasource required')
    expect(badge).toHaveClass('bg-aborted-tertiary', 'rounded-full', 'uppercase')
    expect(badge.querySelector('.bg-aborted-primary')).toBeNull()
  })
})
