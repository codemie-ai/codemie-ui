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

import SeverityChip from '../SeverityChip'

/**
 * `severity?.toLowerCase()` only guarded the lookup key — the fallback
 * branch then called `.replace` directly on the unguarded `severity`,
 * throwing and taking down the whole details drawer for one finding missing
 * a severity (EPMCDME-14234, CR-007). Findings are backend-sourced with no
 * runtime validation, so this is a reachable case, not a hypothetical one.
 */
describe('SeverityChip with a missing severity', () => {
  it('renders "Unknown" instead of throwing when severity is undefined', () => {
    expect(() => render(<SeverityChip severity={undefined} />)).not.toThrow()
    expect(screen.getByText('Unknown')).toBeInTheDocument()
  })

  it('renders "Unknown" instead of throwing when severity is null', () => {
    expect(() => render(<SeverityChip severity={null} />)).not.toThrow()
    expect(screen.getByText('Unknown')).toBeInTheDocument()
  })

  it('still renders the known labels for critical and optional', () => {
    const { rerender } = render(<SeverityChip severity="critical" />)
    expect(screen.getByText('Critical')).toBeInTheDocument()

    rerender(<SeverityChip severity="optional" />)
    expect(screen.getByText('Minor')).toBeInTheDocument()
  })

  it('humanises an unrecognised-but-present severity rather than falling back to Unknown', () => {
    render(<SeverityChip severity="needs_review" />)
    expect(screen.getByText('Needs review')).toBeInTheDocument()
  })

  it('prefixes the label with the count when provided', () => {
    render(<SeverityChip severity="critical" count={3} />)
    expect(screen.getByText('3 Critical')).toBeInTheDocument()
  })
})
