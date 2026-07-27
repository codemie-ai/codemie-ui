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
import { describe, expect, it } from 'vitest'

import StatusBadge, { StatusEnum } from '../StatusBadge'

describe('StatusBadge', () => {
  it('renders with role="status"', () => {
    render(<StatusBadge status={StatusEnum.InProgress} text="In Progress" />)
    expect(screen.getByRole('status')).toBeInTheDocument()
  })

  it('sets aria-label to the text prop', () => {
    render(<StatusBadge status={StatusEnum.InProgress} text="In Progress" />)
    expect(screen.getByRole('status')).toHaveAttribute('aria-label', 'In Progress')
  })

  it('does not set aria-label when text is not provided', () => {
    render(<StatusBadge status={StatusEnum.Success} />)
    expect(screen.getByRole('status')).not.toHaveAttribute('aria-label')
  })

  it('applies correct container class for InProgress status', () => {
    render(<StatusBadge status={StatusEnum.InProgress} text="In Progress" />)
    expect(screen.getByRole('status')).toHaveClass('bg-in-progress-tertiary')
  })
})
