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
import { describe, it, expect, vi } from 'vitest'

import { Assistant } from '@/types/entity/assistant'

import AssistantDetailsSidebarSections from '../AssistantDetailsSidebarSections'

vi.mock('@/hooks/useProjectDisplayNames', () => ({
  useProjectDisplayNames: () => new Map([['my-project', 'My Display Name']]),
}))

vi.mock('@/hooks/useFeatureFlags', () => ({
  useRequestHedgingEnabled: () => [false],
}))

vi.mock('valtio', () => ({
  proxy: (obj: unknown) => obj,
  useSnapshot: vi.fn((store) => store),
  subscribe: vi.fn(),
}))

vi.mock('@/store/appInfo', () => ({
  appInfoStore: { findLLMLabel: () => null },
}))

vi.mock('@/store/mcp', () => ({
  mcpStore: { configs: [], getConfig: vi.fn().mockResolvedValue({}) },
}))

vi.mock('@/pages/assistants/components/ToolkitsViewList', () => ({
  default: () => null,
}))

vi.mock('@/components/guardrails/GuardrailAssignmentsDetails/GuardrailAssignmentsDetails', () => ({
  default: () => null,
}))

vi.mock('../RequestHedgingDetails', () => ({ default: () => null }))

vi.mock('../sidebar_details/SidebarSubassistants', () => ({ default: () => null }))

vi.mock('../sidebar_details/SidebarTags', () => ({ default: () => null }))

const assistant: Assistant = {
  id: 'a1',
  name: 'Test Assistant',
  slug: 'test-assistant',
  description: '',
  is_global: false,
  shared: false,
  created_at: '2024-01-01',
  updated_at: '2024-01-01',
  system_prompt: '',
  llm_model_type: 'gpt-4',
  project: 'my-project',
  mcp_servers: [],
  system_prompt_history: [],
  guardrail_assignments: [],
}

describe('AssistantDetailsSidebarSections — project name display', () => {
  it('shows project display name without data-tooltip-id', () => {
    const { container } = render(<AssistantDetailsSidebarSections assistant={assistant} />)
    expect(container.querySelector('[data-tooltip-id]')).toBeNull()
    expect(container.querySelector('[data-tooltip-content]')).toBeNull()
  })

  it('renders project name and display name together', () => {
    const { getByText } = render(<AssistantDetailsSidebarSections assistant={assistant} />)
    expect(getByText('my-project (My Display Name)')).toBeInTheDocument()
  })
})
