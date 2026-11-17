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

import { EffortLevel } from '@/types/entity/assistant'

import EffortSelect, { EffortWarning } from '../EffortSelect'

describe('EffortSelect', () => {
  it('shows the selected effort level', () => {
    render(
      <EffortSelect levels={[EffortLevel.LOW, EffortLevel.HIGH]} value="high" onChange={vi.fn()} />
    )

    expect(screen.getByText('Effort')).toBeInTheDocument()
    expect(screen.getAllByText('high').length).toBeGreaterThan(0)
  })

  it('shows the validation error', () => {
    render(<EffortSelect levels={[EffortLevel.LOW]} error="Invalid effort" onChange={vi.fn()} />)

    expect(screen.getByText('Invalid effort')).toBeInTheDocument()
  })
})

describe('EffortWarning', () => {
  it('shows the token usage warning', () => {
    render(<EffortWarning />)

    expect(screen.getByText(/may significantly increase token usage/)).toBeInTheDocument()
  })
})
