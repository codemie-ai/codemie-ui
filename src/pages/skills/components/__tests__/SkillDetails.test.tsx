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

import { Skill, SkillVisibility } from '@/types/entity/skill'

import SkillDetails from '../SkillDetails'

vi.mock('@/hooks/useProjectDisplayNames', () => ({
  useProjectDisplayNames: () => new Map([['my-project', 'My Display Name']]),
}))

vi.mock(
  '@/pages/assistants/components/AssistantDetails/components/sidebar_details/SidebarTags',
  () => ({ default: () => null })
)

vi.mock('@/pages/assistants/components/ToolkitsViewList/ToolkitsViewList', () => ({
  default: () => null,
}))

vi.mock('@/pages/skills/components/SkillAssistantsModal', () => ({
  default: () => null,
}))

vi.mock('@/pages/skills/components/SkillDetailsActions', () => ({
  default: () => null,
}))

vi.mock('@/assets/icons/copy.svg?react', () => ({ default: () => null }))

const skill: Skill = {
  id: 's1',
  name: 'test-skill',
  description: 'desc',
  content: 'content',
  project: 'my-project',
  visibility: SkillVisibility.PRIVATE,
  categories: [],
  version: '1.0',
}

describe('SkillDetails — project name display', () => {
  it('shows project display name without data-tooltip-id', () => {
    const { container } = render(
      <SkillDetails skill={skill} onExport={vi.fn()} exporting={false} />
    )
    expect(container.querySelector('[data-tooltip-id]')).toBeNull()
    expect(container.querySelector('[data-tooltip-content]')).toBeNull()
  })

  it('renders project name and display name together', () => {
    const { getByText } = render(
      <SkillDetails skill={skill} onExport={vi.fn()} exporting={false} />
    )
    expect(getByText('my-project (My Display Name)')).toBeInTheDocument()
  })
})
