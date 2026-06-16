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
import { MemoryRouter } from 'react-router'
import { describe, it, expect } from 'vitest'

import ResourceCounterBadge from '../ResourceCounterBadge'

import type { SVGProps } from 'react'


const TestIcon = (props: SVGProps<SVGSVGElement>) => <svg data-testid="icon" {...props} />

describe('ResourceCounterBadge', () => {
  it('renders as a link with the given to path', () => {
    render(
      <MemoryRouter>
        <ResourceCounterBadge
          icon={TestIcon}
          count={7}
          tooltip="Assistants"
          to="/assistants?project=foo"
        />
      </MemoryRouter>
    )
    expect(screen.getByRole('link', { name: 'Assistants' })).toHaveAttribute(
      'href',
      '/assistants?project=foo'
    )
  })

  it('renders the count', () => {
    render(
      <MemoryRouter>
        <ResourceCounterBadge icon={TestIcon} count={7} tooltip="Assistants" to="/assistants" />
      </MemoryRouter>
    )
    expect(screen.getByText('7')).toBeInTheDocument()
  })

  it('renders 0 when count is undefined', () => {
    render(
      <MemoryRouter>
        <ResourceCounterBadge
          icon={TestIcon}
          count={undefined}
          tooltip="Assistants"
          to="/assistants"
        />
      </MemoryRouter>
    )
    expect(screen.getByText('0')).toBeInTheDocument()
  })

  it('sets aria-label from tooltip', () => {
    render(
      <MemoryRouter>
        <ResourceCounterBadge icon={TestIcon} count={3} tooltip="Workflows" to="/workflows" />
      </MemoryRouter>
    )
    expect(screen.getByRole('link', { name: 'Workflows' })).toBeInTheDocument()
  })
})
