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

import { fireEvent, render, screen } from '@testing-library/react'
import { describe, it, expect, vi, beforeEach } from 'vitest'

import UnifiedBudgetDragBar from '../UnifiedBudgetDragBar'

const onChange = vi.fn()
const onDragStart = vi.fn()

const renderBar = (disabled?: boolean) =>
  render(
    <UnifiedBudgetDragBar
      pcts={{ platform: 30, cli: 60, premium_models: 10 }}
      totalBudget={1000}
      platformMinPct={0}
      onChange={onChange}
      onDragStart={onDragStart}
      disabled={disabled}
    />
  )

const getSlider = () => screen.getByRole('slider', { name: 'Budget allocation slider' })

describe('UnifiedBudgetDragBar', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    document.body.style.cursor = ''
  })

  it('starts a drag on mouse down when enabled', () => {
    renderBar()
    const slider = getSlider()

    fireEvent.mouseDown(slider, { clientX: 10 })

    expect(onDragStart).toHaveBeenCalledTimes(1)
    expect(slider).not.toHaveAttribute('aria-disabled')
    expect(slider).toHaveAttribute('tabIndex', '0')
  })

  it('ignores mouse and touch input when disabled', () => {
    renderBar(true)
    const slider = getSlider()

    fireEvent.mouseDown(slider, { clientX: 10 })
    fireEvent.mouseMove(window, { clientX: 50 })
    fireEvent.touchStart(slider, { touches: [{ clientX: 10 }] })

    expect(onDragStart).not.toHaveBeenCalled()
    expect(onChange).not.toHaveBeenCalled()
    expect(slider).toHaveAttribute('aria-disabled', 'true')
    expect(slider).toHaveAttribute('tabIndex', '-1')
  })
})
