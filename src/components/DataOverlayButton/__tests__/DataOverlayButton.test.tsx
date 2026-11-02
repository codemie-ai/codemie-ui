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

import { act, render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'

import DataOverlayButton from '../DataOverlayButton'

vi.mock('@/assets/icons/info.svg?react', () => ({
  default: () => <span data-testid="info-icon" />,
}))

// Stateful OverlayPanel mock, faithful to PrimeReact 10.9: `isVisible()` returns the panel's React
// state, so inside the click handler that toggled it the value is the one from the last render -
// which is what lets the opening click fetch and the closing click not.
vi.mock('primereact/overlaypanel', async () => {
  const { forwardRef, useImperativeHandle, useState } = await import('react')

  const OverlayPanel = forwardRef(
    ({ children }: { children: React.ReactNode }, ref: React.ForwardedRef<unknown>) => {
      const [visible, setVisible] = useState(false)

      useImperativeHandle(ref, () => ({
        toggle: () => setVisible((current) => !current),
        show: () => setVisible(true),
        hide: () => setVisible(false),
        isVisible: () => visible,
        align: () => {},
      }))

      if (!visible) return null
      return <div data-testid="overlay-panel">{children}</div>
    }
  )
  OverlayPanel.displayName = 'OverlayPanel'

  return { OverlayPanel }
})

interface Usage {
  requests: number
}

const renderRows = (usage: Usage) => ({ Requests: usage.requests })

const renderButton = (data: () => Promise<Usage>) =>
  render(
    <DataOverlayButton<Usage>
      title="Usage details"
      subtitle="Current session"
      data={data}
      render={renderRows}
    />
  )

const getToggle = () => screen.getByRole('button', { name: 'Usage details' })

describe('DataOverlayButton', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  it('fetches once when the panel is opened and renders the resolved rows', async () => {
    const user = userEvent.setup()
    const data = vi.fn().mockResolvedValue({ requests: 42 })

    renderButton(data)
    await user.click(getToggle())

    expect(await screen.findByText('42')).toBeInTheDocument()
    expect(screen.getByText('Requests:')).toBeInTheDocument()
    expect(data).toHaveBeenCalledTimes(1)
  })

  it('does not fetch again when the click closes the panel', async () => {
    const user = userEvent.setup()
    const data = vi.fn().mockResolvedValue({ requests: 42 })

    renderButton(data)
    await user.click(getToggle())
    await screen.findByText('42')

    await user.click(getToggle())

    expect(screen.queryByTestId('overlay-panel')).not.toBeInTheDocument()
    expect(data).toHaveBeenCalledTimes(1)
  })

  it('fetches again when the panel is reopened', async () => {
    const user = userEvent.setup()
    const data = vi.fn().mockResolvedValue({ requests: 42 })

    renderButton(data)
    await user.click(getToggle())
    await screen.findByText('42')
    await user.click(getToggle())

    await user.click(getToggle())

    expect(await screen.findByText('42')).toBeInTheDocument()
    expect(data).toHaveBeenCalledTimes(2)
  })

  it('shows an error message instead of an empty panel when the fetch fails', async () => {
    const user = userEvent.setup()
    const consoleError = vi.spyOn(console, 'error').mockImplementation(() => {})
    const data = vi.fn().mockRejectedValue(new Error('boom'))

    renderButton(data)
    await user.click(getToggle())

    expect(await screen.findByText('Could not load usage details')).toBeInTheDocument()
    expect(screen.getByText('Usage details')).toBeInTheDocument()
    expect(consoleError).toHaveBeenCalled()
  })

  it('shows the loading state while the fetch is pending', async () => {
    const user = userEvent.setup()
    let resolveData: (usage: Usage) => void = () => {}
    const pending = new Promise<Usage>((resolve) => {
      resolveData = resolve
    })
    const data = vi.fn().mockReturnValue(pending)

    renderButton(data)
    await user.click(getToggle())

    expect(screen.getByText('Loading...')).toBeInTheDocument()

    await act(async () => {
      resolveData({ requests: 7 })
      await pending
    })

    expect(screen.queryByText('Loading...')).not.toBeInTheDocument()
    expect(screen.getByText('7')).toBeInTheDocument()
  })
})
