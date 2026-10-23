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
import userEvent from '@testing-library/user-event'
import { afterEach, describe, expect, it, vi } from 'vitest'

import ServerActions from '../ServerActions'

vi.mock('@/assets/icons/connection.svg?react', () => ({ default: () => <span /> }))
vi.mock('@/assets/icons/edit.svg?react', () => ({ default: () => <span /> }))
vi.mock('@/assets/icons/delete.svg?react', () => ({ default: () => <span /> }))

afterEach(cleanup)

const server = { id: 'mcp-1', name: 'My MCP' } as any

describe('ServerActions', () => {
  it('calls onEdit with the server when Edit Server is clicked', async () => {
    const onEdit = vi.fn()
    const user = userEvent.setup()
    render(<ServerActions server={server} onEdit={onEdit} onDelete={vi.fn()} onTest={vi.fn()} />)

    await user.click(screen.getByRole('button', { name: /Edit Server/i }))

    expect(onEdit).toHaveBeenCalledWith(server)
  })

  it('calls onDelete with the server when Delete Server is clicked', async () => {
    const onDelete = vi.fn()
    const user = userEvent.setup()
    render(<ServerActions server={server} onEdit={vi.fn()} onDelete={onDelete} onTest={vi.fn()} />)

    await user.click(screen.getByRole('button', { name: /Delete Server/i }))

    expect(onDelete).toHaveBeenCalledWith(server)
  })

  it('calls onTest with the server when Test Integration is clicked', async () => {
    const onTest = vi.fn()
    const user = userEvent.setup()
    render(<ServerActions server={server} onEdit={vi.fn()} onDelete={vi.fn()} onTest={onTest} />)

    await user.click(screen.getByRole('button', { name: /Test Integration/i }))

    expect(onTest).toHaveBeenCalledWith(server)
  })

  it('shows Testing... and disables the test button while testing', () => {
    render(
      <ServerActions
        server={server}
        onEdit={vi.fn()}
        onDelete={vi.fn()}
        onTest={vi.fn()}
        isTesting
      />
    )

    expect(screen.getByRole('button', { name: /Testing\.\.\./i })).toBeDisabled()
  })
})
