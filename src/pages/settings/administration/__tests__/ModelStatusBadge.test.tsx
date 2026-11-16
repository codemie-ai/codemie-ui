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

import { cleanup, render, screen } from '@testing-library/react'
import { afterEach, describe, it, expect } from 'vitest'

import ModelStatusBadge from '../components/ModelStatusBadge'

afterEach(cleanup)

describe('ModelStatusBadge', () => {
  it('displays "Enabled" for the enabled state', () => {
    render(<ModelStatusBadge status="enabled" />)
    expect(screen.getByText('Enabled')).toBeInTheDocument()
  })

  it('displays "Deprecated" for the deprecated state', () => {
    render(<ModelStatusBadge status="deprecated" />)
    expect(screen.getByText('Deprecated')).toBeInTheDocument()
  })

  it('displays "Disabled" for the disabled state', () => {
    render(<ModelStatusBadge status="disabled" />)
    expect(screen.getByText('Disabled')).toBeInTheDocument()
  })
})
