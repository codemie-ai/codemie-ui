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

import { ReleaseNotesItem } from '../ReleaseNotesItem'

vi.mock('@/assets/icons/bug.svg?react', () => ({
  default: (props: any) => <svg data-testid="bug-icon" {...props} />,
}))

vi.mock('@/assets/icons/lightning.svg?react', () => ({
  default: (props: any) => <svg data-testid="lightning-icon" {...props} />,
}))

vi.mock('@/assets/icons/info.svg?react', () => ({
  default: (props: any) => <svg data-testid="info-icon" {...props} />,
}))

describe('ReleaseNotesItem', () => {
  it('renders standalone item with one issue', () => {
    render(
      <ReleaseNotesItem
        item={{
          title: 'Standalone feature',
          description: 'A single issue item.',
          issues: [
            {
              key: 'EPMCDME-12345',
              type: 'STORY',
              link: 'https://jiraeu.epam.com/browse/EPMCDME-12345',
            },
          ],
        }}
      />
    )

    expect(screen.getByText('Standalone feature')).toBeInTheDocument()
    expect(screen.getByText('A single issue item.')).toBeInTheDocument()
    expect(screen.getByText('EPMCDME-12345')).toBeInTheDocument()
  })

  it('renders grouped item with multiple issues', () => {
    render(
      <ReleaseNotesItem
        item={{
          title: 'Bug fix group',
          description: 'Multiple bug fixes.',
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
        }}
      />
    )

    expect(screen.getByText('Bug fix group')).toBeInTheDocument()
    expect(screen.getByText('Multiple bug fixes.')).toBeInTheDocument()
    expect(screen.getByText('EPMCDME-11111')).toBeInTheDocument()
    expect(screen.getByText('EPMCDME-11112')).toBeInTheDocument()
  })
})
