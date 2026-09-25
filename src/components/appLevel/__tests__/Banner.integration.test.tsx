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

import { cleanup, render, screen, waitFor } from '@testing-library/react'
import { MemoryRouter } from 'react-router'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'

import { appInfoStore } from '@/store/appInfo'

import Banner from '../Banner'

const hash = (str: string): string => {
  let h = 0
  for (let i = 0; i < str.length; i += 1) {
    h = h * 32 - h + str.charCodeAt(i)
    h = Math.trunc(h)
  }
  return Math.abs(h).toString(36)
}

const renderBanner = () =>
  render(
    <MemoryRouter>
      <Banner />
    </MemoryRouter>
  )

const bannerConfig = (message: string) => [
  { id: 'banner', settings: { enabled: true, message, linkLabel: '', linkRoute: '' } },
]

// The unit suite mocks the store without reactivity, which cannot catch a component that
// subscribes to nothing. This suite runs against the real proxy.
describe('Banner reactivity', () => {
  beforeEach(() => {
    appInfoStore.configs = []
    localStorage.clear()
  })

  afterEach(cleanup)

  it('appears when the config arrives after the first paint', async () => {
    const { container } = renderBanner()
    expect(container.querySelector('[role="alert"]')).not.toBeInTheDocument()

    appInfoStore.configs = bannerConfig('Scheduled maintenance')

    await waitFor(() => expect(screen.getByText('Scheduled maintenance')).toBeInTheDocument())
  })

  it('follows a later refetch without a reload', async () => {
    appInfoStore.configs = bannerConfig('First notice')
    renderBanner()
    await waitFor(() => expect(screen.getByText('First notice')).toBeInTheDocument())

    appInfoStore.configs = bannerConfig('Second notice')

    await waitFor(() => expect(screen.getByText('Second notice')).toBeInTheDocument())
    // the outgoing banner leaves on its exit transition, so wait for it rather than sampling
    await waitFor(() => expect(screen.queryByText('First notice')).not.toBeInTheDocument())
  })

  it('dismisses the banner that was closed, not the one that replaced it', async () => {
    appInfoStore.configs = bannerConfig('First notice')
    const { container } = renderBanner()
    await waitFor(() => expect(screen.getByText('First notice')).toBeInTheDocument())

    // the outgoing banner is still on screen during its exit transition
    appInfoStore.configs = bannerConfig('Second notice')
    await waitFor(() => expect(screen.getByText('Second notice')).toBeInTheDocument())

    const outgoing = Array.from(container.querySelectorAll('[role="alert"]')).find((el) =>
      el.textContent?.includes('First notice')
    )
    // asserted, not branched on: a silent skip would make this regression test vacuous
    expect(outgoing).toBeTruthy()
    ;(outgoing?.querySelector('button[aria-label="Close"]') as HTMLButtonElement).click()

    await waitFor(() =>
      expect(localStorage.getItem(`bannerShown-${hash('First notice')}`)).toBe('true')
    )
    expect(localStorage.getItem(`bannerShown-${hash('Second notice')}`)).toBeNull()
  })

  it('disappears when the setting is turned off', async () => {
    appInfoStore.configs = bannerConfig('Live notice')
    renderBanner()
    await waitFor(() => expect(screen.getByText('Live notice')).toBeInTheDocument())

    appInfoStore.configs = [
      {
        id: 'banner',
        settings: { enabled: false, message: 'Live notice', linkLabel: '', linkRoute: '' },
      },
    ]

    await waitFor(() => expect(screen.queryByText('Live notice')).not.toBeInTheDocument())
  })
})
