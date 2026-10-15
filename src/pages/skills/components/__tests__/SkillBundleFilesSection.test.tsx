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

import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, describe, expect, it, vi } from 'vitest'

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

const makeFile = (path: string, size_bytes: number): SkillCompanionFile => ({
  path,
  content: '',
  encoding: 'text',
  size_bytes,
})

describe('SkillBundleFilesSection', () => {
  const renderSection = (
    overrides: Partial<{
      companionFiles: SkillCompanionFile[]
      savedBundleWarning: string | null
    }> = {}
  ) =>
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
    const MB = 1024 * 1024
    const sixNineMbFiles = ['a', 'b', 'c', 'd', 'e', 'f'].map((n) => makeFile(`${n}.bin`, 9 * MB))

    afterEach(() => {
      ;(skillsStore as any).skillConfig = null
    })

    it('shows no warning when under all ceilings', () => {
      renderSection({ companionFiles: [makeFile('a.md', 1000)] })
      expect(screen.queryByText(/limit/i)).not.toBeInTheDocument()
    })

    it('shows a per-file warning naming the file when a file is over the per-file limit', () => {
      renderSection({ companionFiles: [makeFile('a.bin', 11 * MB)] })
      expect(
        screen.getByText(
          '1 file(s) exceed the 10 MB per-file limit (a.bin). These files will not be available in an assistant workspace.'
        )
      ).toBeInTheDocument()
    })

    it('shows a total-size warning for files that would pass the 50 MB fallback total', () => {
      renderSection({ companionFiles: sixNineMbFiles })
      expect(
        screen.getByText(
          '1 file(s) exceed the 50 MB total size limit (f.bin). These files will not be available in an assistant workspace.'
        )
      ).toBeInTheDocument()
    })

    it('shows a count warning when the file-count limit is exceeded', () => {
      const files = Array.from({ length: 101 }, (_, i) =>
        makeFile(`f${String(i).padStart(3, '0')}.md`, 10)
      )
      renderSection({ companionFiles: files })
      expect(
        screen.getByText(
          '1 file(s) exceed the 100-file limit (f100.md). These files will not be available in an assistant workspace.'
        )
      ).toBeInTheDocument()
    })

    it('uses limits from skillConfig when available', () => {
      ;(skillsStore as any).skillConfig = {
        bundle_seed_max_total_size_bytes: 5 * MB,
        bundle_seed_max_file_size_bytes: MB,
        bundle_seed_max_file_count: 50,
      }
      const files = ['a', 'b', 'c', 'd', 'e', 'f'].map((n) => makeFile(`${n}.bin`, MB))
      renderSection({ companionFiles: files })
      expect(
        screen.getByText(
          '1 file(s) exceed the 5 MB total size limit (f.bin). These files will not be available in an assistant workspace.'
        )
      ).toBeInTheDocument()
    })

    it('does not warn for an 11 MB bundle of small files under a 50 MB total limit', () => {
      ;(skillsStore as any).skillConfig = {
        bundle_seed_max_file_count: 100,
        bundle_seed_max_file_size_bytes: 10 * MB,
        bundle_seed_max_total_size_bytes: 50 * MB,
      }
      renderSection({
        companionFiles: [makeFile('a.bin', 5.5 * MB), makeFile('b.bin', 5.5 * MB)],
      })
      expect(screen.queryByText(/limit/i)).not.toBeInTheDocument()
    })

    it('does not warn about the total when the only oversized file is skipped for its own size', () => {
      renderSection({
        companionFiles: [
          makeFile('a.bin', 11 * MB),
          ...['b', 'c', 'd', 'e'].map((n) => makeFile(`${n}.bin`, 9 * MB)),
        ],
      })
      expect(screen.getByText(/10 MB per-file limit \(a\.bin\)/)).toBeInTheDocument()
      expect(screen.queryByText(/total size limit/i)).not.toBeInTheDocument()
    })

    it('falls back per key when config omits a limit', () => {
      ;(skillsStore as any).skillConfig = { bundle_seed_max_file_count: 100 }
      renderSection({ companionFiles: sixNineMbFiles })
      expect(screen.getByText(/50 MB total size limit/i)).toBeInTheDocument()
    })
  })

  describe('server bundle warning', () => {
    it('shows the server warning when the list is unchanged', () => {
      renderSection({ savedBundleWarning: 'Skipped: big.bin' })
      expect(screen.getByText('Skipped: big.bin')).toBeInTheDocument()
    })

    it('prefers the server warning over the local ceiling warning', () => {
      renderSection({
        companionFiles: [makeFile('a.md', 11 * 1024 * 1024)],
        savedBundleWarning: 'Skipped: big.bin',
      })
      expect(screen.getByText('Skipped: big.bin')).toBeInTheDocument()
      expect(screen.queryByText(/10 MB per-file limit/i)).not.toBeInTheDocument()
    })

    it('hides the server warning after a file is removed and applies the local warning', async () => {
      renderSection({
        companionFiles: [makeFile('a.md', 11 * 1024 * 1024), makeFile('b.md', 10)],
        savedBundleWarning: 'Skipped: big.bin',
      })
      await userEvent.click(screen.getByRole('button', { name: 'Remove b.md' }))
      expect(screen.queryByText('Skipped: big.bin')).not.toBeInTheDocument()
      expect(screen.getByText(/10 MB per-file limit/i)).toBeInTheDocument()
    })

    it('hides the server warning after the user uploads a file', async () => {
      const { container } = renderSection({ savedBundleWarning: 'Skipped: big.bin' })
      const input = container.querySelector('input[type="file"]') as HTMLInputElement
      const file = new File(['x'], 'x.md', { type: 'text/markdown' })
      Object.defineProperty(file, 'text', { value: () => Promise.resolve('x') })
      await userEvent.upload(input, file)
      await waitFor(() => expect(screen.queryByText('Skipped: big.bin')).not.toBeInTheDocument())
    })

    it('shows the server warning again when the warning prop is replaced after an edit', async () => {
      const props = {
        companionFiles: [makeFile('a.md', 10), makeFile('b.md', 10)],
        folders: [] as string[],
        onCompanionFilesChange: vi.fn(),
        onFoldersChange: vi.fn(),
      }
      const { rerender } = render(<SkillBundleFilesSection {...props} savedBundleWarning="A" />)
      await userEvent.click(screen.getByRole('button', { name: 'Remove b.md' }))
      expect(screen.queryByText('A')).not.toBeInTheDocument()
      rerender(<SkillBundleFilesSection {...props} savedBundleWarning={null} />)
      rerender(<SkillBundleFilesSection {...props} savedBundleWarning="A" />)
      expect(screen.getByText('A')).toBeInTheDocument()
    })
  })
})
