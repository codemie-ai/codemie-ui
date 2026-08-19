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

import PremiumModelBadge from '../PremiumModelBadge'

describe('PremiumModelBadge', () => {
  it('renders the Premium status badge with the rates tooltip', () => {
    render(<PremiumModelBadge />)

    const badge = screen.getByRole('status', { name: 'Premium' })
    expect(badge).toBeInTheDocument()
    expect(badge.parentElement).toHaveAttribute('data-tooltip-id', 'react-tooltip')
    expect(badge.parentElement).toHaveAttribute(
      'data-tooltip-content',
      'Premium model — higher usage rates apply'
    )
  })

  // Premium moved out of the horizontal race: dropdown rows say it on a meta
  // line under the model name, so the badge has exactly one shape again — the
  // full pill, on triggers and the models catalog. The legacy variant props are
  // gone; passing them must not resurrect a dot.
  it('renders the full pill and no dot, whatever legacy variant props are passed', () => {
    const legacyProps = { compact: true, adaptive: true, anchorTooltip: false } as Record<
      string,
      unknown
    >

    render(<PremiumModelBadge {...legacyProps} />)

    expect(screen.getByRole('status', { name: 'Premium' })).toBeInTheDocument()
    expect(screen.queryByTestId('premium-model-dot')).toBeNull()
    expect(screen.queryByTestId('premium-model-text')).toBeNull()
    expect(screen.queryByRole('img')).toBeNull()
  })

  // The container query was what made dropdown rows contribute zero intrinsic
  // width — inline-size containment collapsed the chat panel onto its floor.
  // The rule can only come back through these classes, so the badge is asserted
  // as rendered rather than by reading main.scss: a file-wide text assertion
  // bound to the process CWD failed on any unrelated future container query and
  // threw at collection time from any other working directory. The row-level
  // counterparts live in ChatPromptLlmSelector.test and LLMSelector.premiumLayout.test.
  it('renders no container-query hooks on the badge itself', () => {
    const { container } = render(<PremiumModelBadge />)

    expect(container.innerHTML).not.toContain('premium-badge-container')
    expect(container.innerHTML).not.toContain('premium-badge-text')
  })
})
