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

import { skillsStore } from '@/store/skills'
import { SkillCompanionFile } from '@/types/entity/skill'

import SkillBundleFilesSection from '../SkillBundleFilesSection'

vi.mock('valtio', async (importOriginal) => {
  const actual = await importOriginal<typeof import('valtio')>()
  return { ...actual, useSnapshot: vi.fn((store) => store) }
})

vi.mock('@/store/skills', () => ({
  skillsStore: { skillConfig: null },
}))

const companionFiles = [{ path: 'docs/readme.md', size_bytes: 120, content: '' }]

describe('SkillBundleFilesSection', () => {
  const renderSection = (overrides: Partial<{ companionFiles: SkillCompanionFile[] }> = {}) =>
    render(
      <SkillBundleFilesSection
        companionFiles={companionFiles}
        folders={[]}
        onCompanionFilesChange={vi.fn()}
        onFoldersChange={vi.fn()}
        {...overrides}
      />
    )

  it('exposes the remove control with an accessible name', () => {
    renderSection()

    expect(screen.getByRole('button', { name: 'Remove readme.md' })).toBeInTheDocument()
  })

  it('hides the remove control icon from assistive technologies', () => {
    renderSection()

    const removeButton = screen.getByRole('button', { name: 'Remove readme.md' })

    expect(removeButton.querySelector('svg')).toHaveAttribute('aria-hidden', 'true')
  })

  describe('bundle ceiling warning', () => {
    const makeFile = (path: string, size_bytes: number): SkillCompanionFile => ({
      path,
      content: '',
      encoding: 'text',
      size_bytes,
    })

    it('shows no warning when under both ceilings', () => {
      renderSection({ companionFiles: [makeFile('a.md', 1000)] })
      expect(screen.queryByText(/limit/i)).not.toBeInTheDocument()
    })

    it('shows a size-specific warning when the size ceiling is exceeded', () => {
      renderSection({ companionFiles: [makeFile('a.md', 11 * 1024 * 1024)] })
      expect(
        screen.getByText(
          /This bundle is 11\.0 MB \(limit 10\.0 MB\)\. Only files up to this limit.*assistant workspace/i
        )
      ).toBeInTheDocument()
    })

    it('shows a count-specific warning when the file-count ceiling is exceeded', () => {
      const files = Array.from({ length: 101 }, (_, i) => makeFile(`f${i}.md`, 10))
      renderSection({ companionFiles: files })
      expect(
        screen.getByText(
          /This bundle has 101 files \(limit 100\)\. Only files up to this limit.*assistant workspace/i
        )
      ).toBeInTheDocument()
    })

    it('shows a combined warning when both ceilings are exceeded', () => {
      const files = Array.from({ length: 101 }, (_, i) => makeFile(`f${i}.md`, 11 * 1024 * 1024))
      renderSection({ companionFiles: files })
      expect(
        screen.getByText(
          /This bundle has 101 files \(limit 100\) and is 1111\.0 MB \(limit 10\.0 MB\)\. Only files up to these limits.*assistant workspace/i
        )
      ).toBeInTheDocument()
    })

    it('uses ceilings from skillConfig when available', () => {
      ;(skillsStore as any).skillConfig = {
        bundle_seed_max_size_bytes: 5 * 1024 * 1024,
        bundle_seed_max_file_count: 50,
      }
      renderSection({ companionFiles: [makeFile('a.md', 6 * 1024 * 1024)] })
      expect(
        screen.getByText(
          /This bundle is 6\.0 MB \(limit 5\.0 MB\)\. Only files up to this limit.*assistant workspace/i
        )
      ).toBeInTheDocument()
      ;(skillsStore as any).skillConfig = null
    })
  })
})
