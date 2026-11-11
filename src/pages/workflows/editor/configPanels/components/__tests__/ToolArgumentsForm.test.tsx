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

import ToolArgumentsForm from '../ToolArgumentsForm'

const mockGetToolSchema = vi.fn()

vi.mock('@/store', () => ({
  assistantsStore: {
    getToolSchema: (...args: unknown[]) => mockGetToolSchema(...args),
  },
}))

describe('ToolArgumentsForm — required free-entry list argument (AC4)', () => {
  it('exposes aria-required="true" on a required list argument row', async () => {
    mockGetToolSchema.mockResolvedValue({
      args_schema: { to: { type: 'list', required: true } },
    })

    render(
      <ToolArgumentsForm
        toolName="exchange_forward"
        value={{ to: ['a@b.com'] }}
        onChange={vi.fn()}
      />
    )

    await screen.findByText('To')
    expect(screen.getAllByRole('textbox')[0]).toHaveAttribute('aria-required', 'true')
  })

  it('does not expose aria-required on an optional list argument row', async () => {
    mockGetToolSchema.mockResolvedValue({
      args_schema: { to: { type: 'list', required: false } },
    })

    render(
      <ToolArgumentsForm toolName="exchange_send" value={{ to: ['a@b.com'] }} onChange={vi.fn()} />
    )

    await screen.findByText('To')
    expect(screen.getAllByRole('textbox')[0]).not.toHaveAttribute('aria-required', 'true')
  })
})
