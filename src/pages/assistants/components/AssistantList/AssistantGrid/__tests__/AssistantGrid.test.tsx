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

import AssistantGrid from '../AssistantGrid'

const baseProps = {
  assistants: [],
  assistantTemplates: [],
  user: null,
  showAssistant: vi.fn(),
  reloadAssistants: vi.fn(),
  totalCount: 0,
}

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
