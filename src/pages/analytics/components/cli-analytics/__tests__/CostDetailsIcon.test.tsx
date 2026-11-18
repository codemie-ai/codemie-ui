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
import { describe, expect, it, vi } from 'vitest'

import { CostDetailsIcon } from '../views/CostIncompleteNotice'

describe('CostDetailsIcon tooltip (EPMCDME-17152)', () => {
  it('is left-aligned even when opened from a right-aligned cell', () => {
    render(
      <div className="text-right">
        <CostDetailsIcon status="Partial estimate" models={['a', 'b']} testId="mark" />
      </div>
    )

    fireEvent.mouseEnter(screen.getByTestId('mark'))

    const tip = screen.getByRole('tooltip')
    expect(tip).toHaveClass('!text-left')
    expect(tip).toHaveClass('whitespace-pre-line')
  })

  it('does not trigger a clickable row it sits in', () => {
    const onRow = vi.fn()
    render(
      // eslint-disable-next-line jsx-a11y/click-events-have-key-events, jsx-a11y/no-static-element-interactions
      <div onClick={onRow}>
        <CostDetailsIcon status="Partial estimate" models={[]} testId="mark" />
      </div>
    )

    fireEvent.click(screen.getByTestId('mark'))

    expect(onRow).not.toHaveBeenCalled()
    expect(screen.getByRole('tooltip')).toBeInTheDocument()
  })
})
