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

import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import { appInfoStore } from '@/store/appInfo'
import { customerConfigurationStore } from '@/store/customerConfiguration'
import { userStore } from '@/store/user'
import { SettingDeclaration } from '@/types/entity/customerConfiguration'
import { User } from '@/types/entity/user'
import toaster from '@/utils/toaster'

import CustomerConfigurationPage from '../CustomerConfigurationPage'

const mockNavigate = vi.fn()

vi.mock('react-router', async () => {
  const actual = await vi.importActual('react-router')
  return { ...actual, useNavigate: () => mockNavigate }
})

vi.mock('@/utils/toaster', () => ({
  default: { info: vi.fn(), error: vi.fn(), success: vi.fn() },
}))

const asUser = (isAdmin: boolean, isMaintainer = false) => ({ isAdmin, isMaintainer }) as User

const declaration = (overrides: Partial<SettingDeclaration> = {}): SettingDeclaration => ({
  component_id: 'chatDisclaimer',
  label: 'Chat disclaimer',
  description: 'Shown below the chat input',
  overridden: false,
  value: { enabled: false, text: '' },
  fields: [
    { name: 'enabled', type: 'switch', label: 'Show disclaimer', description: null, required: false, max_length: null, pattern: null, pattern_message: null, markup: 'plain' },
    { name: 'text', type: 'textarea', label: 'Disclaimer text', description: null, required: false, max_length: 1000, pattern: null, pattern_message: null, markup: 'markdown' },
  ],
  ...overrides,
})

describe('CustomerConfigurationPage', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    userStore.user = asUser(true)
    customerConfigurationStore.settings = []
    customerConfigurationStore.indexSettings = vi.fn().mockResolvedValue([])
    customerConfigurationStore.saveSetting = vi.fn().mockResolvedValue({})
    customerConfigurationStore.resetSetting = vi.fn().mockResolvedValue(undefined)
    appInfoStore.refetchCustomerConfig = vi.fn().mockResolvedValue([])
  })

  afterEach(cleanup)

  // The unit setup mocks valtio without reactivity, so state must be in place before render
  const withSettings = (settings: SettingDeclaration[]) => {
    customerConfigurationStore.settings = settings
    customerConfigurationStore.indexSettings = vi.fn().mockResolvedValue(settings)
  }

  it('renders a form per declared setting', async () => {
    withSettings([declaration()])

    render(<CustomerConfigurationPage />)

    expect(await screen.findByText('Chat disclaimer')).toBeInTheDocument()
    expect(screen.getByLabelText('Show disclaimer')).toBeInTheDocument()
    expect(screen.getByLabelText('Disclaimer text')).toBeInTheDocument()
  })

  it('shows an empty state for an empty registry instead of an error', async () => {
    withSettings([])

    render(<CustomerConfigurationPage />)

    expect(await screen.findByText(/no dynamic settings/i)).toBeInTheDocument()
  })

  it('marks an overridden setting', async () => {
    withSettings([declaration({ overridden: true, value: { enabled: true, text: 'hi' } })])

    render(<CustomerConfigurationPage />)

    expect(await screen.findByText('Overridden')).toBeInTheDocument()
  })

  it('marks a setting still coming from the deployment default', async () => {
    withSettings([declaration()])

    render(<CustomerConfigurationPage />)

    expect(await screen.findByText('Default from config')).toBeInTheDocument()
  })

  it('saves the edited value and refreshes the app config', async () => {
    withSettings([declaration()])

    render(<CustomerConfigurationPage />)
    fireEvent.change(await screen.findByLabelText('Disclaimer text'), { target: { value: 'Mind the gap' } })
    fireEvent.click(screen.getByRole('button', { name: /save/i }))

    await waitFor(() => {
      expect(customerConfigurationStore.saveSetting).toHaveBeenCalledWith('chatDisclaimer', {
        enabled: false,
        text: 'Mind the gap',
      })
    })
    await waitFor(() => expect(appInfoStore.refetchCustomerConfig).toHaveBeenCalled())
  })

  it('resets an overridden setting', async () => {
    withSettings([declaration({ overridden: true, value: { enabled: true, text: 'hi' } })])

    render(<CustomerConfigurationPage />)
    fireEvent.click(await screen.findByRole('button', { name: /^reset to default$/i }))

    await waitFor(() => expect(customerConfigurationStore.resetSetting).toHaveBeenCalledWith('chatDisclaimer'))
  })

  it('offers no reset for a setting that is not overridden', async () => {
    withSettings([declaration()])

    render(<CustomerConfigurationPage />)
    await screen.findByText('Chat disclaimer')

    expect(screen.queryByRole('button', { name: /^reset to default$/i })).not.toBeInTheDocument()
  })

  it('blocks saving while the form is invalid', async () => {
    withSettings([
      declaration({
        fields: [
          { name: 'text', type: 'input', label: 'Disclaimer text', description: null, required: false, max_length: 5, pattern: null, pattern_message: null, markup: 'plain' },
        ],
        value: { text: '' },
      }),
    ])

    render(<CustomerConfigurationPage />)
    fireEvent.change(await screen.findByLabelText('Disclaimer text'), { target: { value: 'far too long' } })

    expect(screen.getByRole('button', { name: /save/i })).toBeDisabled()
  })

  describe('reset all', () => {
    const overridden = (componentId: string) =>
      declaration({ component_id: componentId, overridden: true, value: { enabled: true, text: 'x' } })

    it('resets every overridden setting from one header control', async () => {
      withSettings([overridden('chatDisclaimer'), overridden('bannerMessage')])

      render(<CustomerConfigurationPage />)
      fireEvent.click(await screen.findByRole('button', { name: /reset all to default/i }))

      await waitFor(() => {
        expect(customerConfigurationStore.resetSetting).toHaveBeenCalledWith('chatDisclaimer')
        expect(customerConfigurationStore.resetSetting).toHaveBeenCalledWith('bannerMessage')
      })
    })

    it('skips settings that are already on their default', async () => {
      withSettings([overridden('chatDisclaimer'), declaration({ component_id: 'bannerMessage' })])

      render(<CustomerConfigurationPage />)
      fireEvent.click(await screen.findByRole('button', { name: /reset all to default/i }))

      await waitFor(() => expect(customerConfigurationStore.resetSetting).toHaveBeenCalledTimes(1))
      expect(customerConfigurationStore.resetSetting).toHaveBeenCalledWith('chatDisclaimer')
    })

    it('refreshes the app config once every setting is reset', async () => {
      withSettings([overridden('chatDisclaimer')])

      render(<CustomerConfigurationPage />)
      fireEvent.click(await screen.findByRole('button', { name: /reset all to default/i }))

      await waitFor(() => expect(appInfoStore.refetchCustomerConfig).toHaveBeenCalled())
    })

    it('disables the control when nothing is overridden', async () => {
      withSettings([declaration()])

      render(<CustomerConfigurationPage />)

      expect(await screen.findByRole('button', { name: /reset all to default/i })).toBeDisabled()
    })

    it('offers no reset-all control for an empty registry', async () => {
      withSettings([])

      render(<CustomerConfigurationPage />)
      await screen.findByText(/no dynamic settings/i)

      expect(screen.queryByRole('button', { name: /reset all to default/i })).not.toBeInTheDocument()
    })

    it('reports a failure and leaves the page usable', async () => {
      withSettings([overridden('chatDisclaimer')])
      customerConfigurationStore.resetSetting = vi.fn().mockRejectedValue(new Error('boom'))

      render(<CustomerConfigurationPage />)
      fireEvent.click(await screen.findByRole('button', { name: /reset all to default/i }))

      await waitFor(() => expect(toaster.error).toHaveBeenCalled())
    })
  })

  it('redirects a user who cannot edit', async () => {
    userStore.user = asUser(false)

    render(<CustomerConfigurationPage />)

    await waitFor(() => expect(mockNavigate).toHaveBeenCalledWith('/settings/administration'))
  })
})
