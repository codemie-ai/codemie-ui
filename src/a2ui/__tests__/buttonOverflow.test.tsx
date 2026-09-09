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

import { ButtonRenderer } from '../renderers'

const LONG_LABEL = 'Approve and forward to the finance team'

describe('ButtonRenderer narrow-width behaviour', () => {
  const renderButton = () =>
    render(
      <ButtonRenderer
        props={{ action: vi.fn(), child: 'label' }}
        buildChild={() => <span>{LONG_LABEL}</span>}
      />
    )

  it('lets an overlong label wrap instead of keeping it on one line', () => {
    renderButton()

    expect(screen.getByRole('button').className).toContain('whitespace-normal')
  })

  it('drops the fixed height so a wrapped label is not clipped', () => {
    renderButton()

    expect(screen.getByRole('button').className).toContain('h-auto')
  })

  it('breaks a label that offers no space to wrap at', () => {
    // An LLM-authored action name is often underscore-joined or a bare URL: a single
    // unbreakable word wraps nowhere and, with nothing clipping it, would spill again.
    renderButton()

    expect(screen.getByRole('button').className).toContain('break-all')
  })

  it('never hides part of the label — the whole label stays in the accessible name', () => {
    renderButton()

    expect(screen.getByRole('button')).toHaveAccessibleName(LONG_LABEL)
  })
})
