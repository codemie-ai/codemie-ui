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
import React from 'react'
import { describe, expect, it, vi } from 'vitest'

import NewSkillPage from '../NewSkillPage'

vi.mock('@/store/skills', () => ({
  skillsStore: {
    loadShowNewSkillAIPopup: vi.fn(() => false),
    createSkill: vi.fn(),
  },
}))

vi.mock('@/hooks/useVueRouter', () => ({ useVueRouter: vi.fn(() => ({})) }))

vi.mock('@/hooks/useNewIntegrationPopup', () => ({
  useNewIntegrationPopup: vi.fn(() => ({
    showNewIntegration: false,
    selectedCredentialType: null,
    selectedProject: null,
    showNewIntegrationPopup: vi.fn(),
    hideNewIntegrationPopup: vi.fn(),
    onIntegrationSuccess: vi.fn(),
  })),
}))

vi.mock('@/pages/skills/hooks/useSkillForm', () => ({
  useSkillForm: vi.fn(() => ({
    form: { setValue: vi.fn() },
    onSubmit: vi.fn(),
    companionFiles: [],
    setCompanionFiles: vi.fn(),
    bundleFolders: [],
    setBundleFolders: vi.fn(),
    isCompanionFilesLoading: false,
    applyBundlePreview: vi.fn(),
  })),
}))

vi.mock('@/pages/skills/utils/goBackSkills', () => ({ goBackSkills: vi.fn() }))
vi.mock('@/pages/skills/utils/skillUtils', () => ({
  downloadSkillExample: vi.fn(),
  parseSkillMarkdownFile: vi.fn(),
}))

vi.mock('@/pages/skills/components/SkillForm', () => ({ default: vi.fn(() => null) }))
vi.mock('@/pages/skills/components/SkillsNavigation', () => ({ default: vi.fn(() => null) }))
vi.mock('@/pages/skills/components/FormGenAIPopup', () => ({ default: vi.fn(() => null) }))
vi.mock('@/pages/integrations/components/NewIntegrationPopup', () => ({
  default: vi.fn(() => null),
}))
vi.mock('@/components/Sidebar', () => ({ default: vi.fn(() => null) }))

vi.mock('@/components/Layouts/Layout/PageLayout', () => ({
  default: vi.fn(
    ({ rightContent, children }: { rightContent: React.ReactNode; children: React.ReactNode }) => (
      <div>
        {rightContent}
        {children}
      </div>
    )
  ),
}))

describe('NewSkillPage save button', () => {
  it('renders a "Save" button', () => {
    render(<NewSkillPage />)
    expect(screen.getByRole('button', { name: 'Save' })).toBeInTheDocument()
  })

  it('does not render a "Create Skill" button', () => {
    render(<NewSkillPage />)
    expect(screen.queryByRole('button', { name: /create skill/i })).not.toBeInTheDocument()
  })
})
