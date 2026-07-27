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
import { describe, it, expect } from 'vitest'

import IntegrationStateBadge from '../IntegrationStateBadge'

describe('IntegrationStateBadge', () => {
  it('renders Enabled badge when is_enabled is true', () => {
    render(<IntegrationStateBadge credentialValues={[{ key: 'is_enabled', value: true }]} />)
    expect(screen.getByText('Enabled')).toBeInTheDocument()
  })

  it('renders Disabled badge when is_enabled is false', () => {
    render(<IntegrationStateBadge credentialValues={[{ key: 'is_enabled', value: false }]} />)
    expect(screen.getByText('Disabled')).toBeInTheDocument()
  })

  it('renders nothing when is_enabled is absent from credential_values', () => {
    const { container } = render(
      <IntegrationStateBadge credentialValues={[{ key: 'url', value: 'https://example.com' }]} />
    )
    expect(container.firstChild).toBeNull()
  })

  it('renders nothing when credential_values is empty', () => {
    const { container } = render(<IntegrationStateBadge credentialValues={[]} />)
    expect(container.firstChild).toBeNull()
  })

  it("renders Enabled badge when is_enabled is the string 'true'", () => {
    render(<IntegrationStateBadge credentialValues={[{ key: 'is_enabled', value: 'true' }]} />)
    expect(screen.getByText('Enabled')).toBeInTheDocument()
  })

  it("renders Enabled badge when is_enabled is the string 'True'", () => {
    render(<IntegrationStateBadge credentialValues={[{ key: 'is_enabled', value: 'True' }]} />)
    expect(screen.getByText('Enabled')).toBeInTheDocument()
  })

  it('renders Enabled badge when is_enabled is the number 1', () => {
    render(<IntegrationStateBadge credentialValues={[{ key: 'is_enabled', value: 1 }]} />)
    expect(screen.getByText('Enabled')).toBeInTheDocument()
  })
})
