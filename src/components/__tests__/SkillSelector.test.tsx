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

import SkillSelector from '@/components/SkillSelector'

vi.mock('@/hooks/useSkillSelector', () => ({
  useSkillSelector: () => ({
    options: [{ value: 'sk-known', label: 'epam-pptx-template', description: '' }],
    loading: false,
    refetch: vi.fn(),
  }),
}))

describe('SkillSelector', () => {
  it('renders the real name for a selected id missing from loaded options', () => {
    render(
      <SkillSelector
        project="proj-1"
        value={['sk-known', 'sk-hidden']}
        onChange={vi.fn()}
        knownSkills={[{ id: 'sk-hidden', name: 'codemie-speech-presentation-content' }]}
      />
    )

    expect(screen.getByText(/codemie-speech-presentation-content/)).toBeInTheDocument()
    expect(screen.queryByText(/^null$/)).not.toBeInTheDocument()
  })

  it('falls back to the raw id when a selected id is unknown everywhere', () => {
    render(
      <SkillSelector project="proj-1" value={['sk-missing']} onChange={vi.fn()} knownSkills={[]} />
    )

    expect(screen.getByText(/sk-missing/)).toBeInTheDocument()
    expect(screen.queryByText(/^null$/)).not.toBeInTheDocument()
  })

  it('does not duplicate an option that is both loaded and in knownSkills', () => {
    render(
      <SkillSelector
        project="proj-1"
        value={['sk-known']}
        onChange={vi.fn()}
        knownSkills={[{ id: 'sk-known', name: 'stale-name-should-be-ignored' }]}
      />
    )

    expect(screen.getAllByText(/epam-pptx-template/)).toHaveLength(1)
  })
})
