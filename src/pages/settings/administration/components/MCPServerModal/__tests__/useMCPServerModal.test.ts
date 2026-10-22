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

import { act, renderHook } from '@testing-library/react'
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'

import { useMCPServerModal } from '../useMCPServerModal'

const toasterMock = vi.hoisted(() => ({ error: vi.fn() }))

vi.mock('@/utils/toaster', () => ({ default: toasterMock }))

describe('useMCPServerModal — submit error handling', () => {
  beforeEach(() => {
    toasterMock.error.mockReset()
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  it('does not show its own toast and keeps the modal open when onSubmit rejects with the Response the API layer already toasted for', async () => {
    const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => undefined)
    const onSubmit = vi.fn().mockRejectedValue(new Response(null, { status: 409 }))
    const onHide = vi.fn()

    const { result } = renderHook(() =>
      useMCPServerModal({
        visible: true,
        mode: 'add',
        server: null,
        onHide,
        onSubmit,
      })
    )

    act(() => {
      result.current.form.setValue('name', 'Test')
      result.current.form.setValue('description', 'Test description')
      result.current.form.setValue('server_home_url', 'https://example.com')
      result.current.form.setValue('source_url', 'https://example.com/source')
      result.current.form.setValue('serverConfig', '{}')
    })

    await act(async () => {
      await result.current.onFormSubmit()
    })

    expect(toasterMock.error).not.toHaveBeenCalled()
    expect(onHide).not.toHaveBeenCalled()
    expect(consoleErrorSpy).toHaveBeenCalledWith('Failed to save MCP server:', expect.any(Response))
  })

  it('shows a fallback toast when onSubmit rejects with a network-level error the API layer never saw', async () => {
    const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => undefined)
    const onSubmit = vi.fn().mockRejectedValue(new Error('Failed to fetch'))
    const onHide = vi.fn()

    const { result } = renderHook(() =>
      useMCPServerModal({
        visible: true,
        mode: 'add',
        server: null,
        onHide,
        onSubmit,
      })
    )

    act(() => {
      result.current.form.setValue('name', 'Test')
      result.current.form.setValue('description', 'Test description')
      result.current.form.setValue('server_home_url', 'https://example.com')
      result.current.form.setValue('source_url', 'https://example.com/source')
      result.current.form.setValue('serverConfig', '{}')
    })

    await act(async () => {
      await result.current.onFormSubmit()
    })

    expect(toasterMock.error).toHaveBeenCalledWith('Failed to fetch')
    expect(onHide).not.toHaveBeenCalled()
    expect(consoleErrorSpy).toHaveBeenCalledWith('Failed to save MCP server:', expect.any(Error))
  })
})
