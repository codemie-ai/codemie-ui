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

import { SectionCode } from '../../types'
import { ReleaseNotesSection } from '../ReleaseNotesSection'

vi.mock('@/assets/icons/bug.svg?react', () => ({
  default: (props: any) => <svg data-testid="bug-icon" {...props} />,
}))

vi.mock('@/assets/icons/lightning.svg?react', () => ({
  default: (props: any) => <svg data-testid="lightning-icon" {...props} />,
}))

vi.mock('@/assets/icons/info.svg?react', () => ({
  default: (props: any) => <svg data-testid="info-icon" {...props} />,
}))

describe('ReleaseNotesSection', () => {
  it('renders section title and items', () => {
    render(
      <ReleaseNotesSection
        section={{
          code: SectionCode.Fixes,
          items: [
            {
              title: 'Bug fix group',
              description: 'Fixed several things.',
              issues: [
                {
                  key: 'EPMCDME-11111',
                  type: 'BUG',
                  link: 'https://jiraeu.epam.com/browse/EPMCDME-11111',
                },
                {
                  key: 'EPMCDME-11112',
                  type: 'BUG',
                  link: 'https://jiraeu.epam.com/browse/EPMCDME-11112',
                },
              ],
            },
          ],
        }}
      />
    )

    expect(screen.getByText('Fixes')).toBeInTheDocument()
    expect(screen.getByText('Bug fix group')).toBeInTheDocument()
    expect(screen.getByText('Fixed several things.')).toBeInTheDocument()
  })

  it('does not render empty section', () => {
    const { container } = render(
      <ReleaseNotesSection section={{ code: SectionCode.Highlights, items: [] }} />
    )

    expect(container.firstChild).toBeNull()
    expect(screen.queryByText('Highlights')).not.toBeInTheDocument()
  })
})
