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

import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { useForm } from 'react-hook-form'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import { userSettingsStore } from '@/store/userSettings'
import toaster from '@/utils/toaster'

import IntegrationSection from '../IntegrationSection'

vi.mock('@/pages/integrations/components/NewIntegrationPopup', () => ({
  default: () => null,
}))

vi.mock('@/store/userSettings', () => ({
  userSettingsStore: {
    resetIsSettingsIndexed: vi.fn(),
    indexSettings: vi.fn().mockResolvedValue(undefined),
  },
}))

vi.mock('@/utils/toaster', () => ({
  default: { error: vi.fn(), info: vi.fn(), success: vi.fn() },
}))

const noop = vi.fn()
const confluenceSetting = {
  id: 's-1',
  alias: 'My Confluence',
  setting_type: 'Confluence',
  project_name: null,
  is_global: true,
  credential_type: 'confluence',
}

function TestWrapper({
  hasNoSettings,
  isDropdownShown,
  settings,
  isRequired = true,
}: Readonly<{
  hasNoSettings: boolean
  isDropdownShown: boolean
  settings: (typeof confluenceSetting)[]
  isRequired?: boolean
}>) {
  const {
    control,
    formState: { errors },
  } = useForm()
  return (
    <IntegrationSection
      hasNoSettings={hasNoSettings}
      isDropdownShown={isDropdownShown}
      datasourceType="confluence"
      projectName="test-project"
      control={control}
      errors={errors}
      filteredSettings={{ confluence: settings }}
      showIntegrationPopup={false}
      onOpenIntegrationPopup={noop}
      onIntegrationSuccess={noop}
      onIntegrationCancel={noop}
      integrationLabel="Integration"
      integrationPlaceholder="Select integration"
      isRequired={isRequired}
    />
  )
}

describe('IntegrationSection', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('hasNoSettings state', () => {
    it('renders a disabled dropdown instead of the standalone add button', () => {
      render(<TestWrapper hasNoSettings={true} isDropdownShown={false} settings={[]} />)
      const combobox = screen.getByRole('combobox')
      expect(combobox).toBeInTheDocument()
      expect(combobox.closest('.p-dropdown')).toHaveClass('p-disabled')
      expect(
        screen.queryByRole('button', { name: /add user integration/i })
      ).not.toBeInTheDocument()
    })

    it('keeps Add User Integration button accessible for optional integrations when no settings exist', () => {
      render(
        <TestWrapper
          hasNoSettings={true}
          isDropdownShown={false}
          settings={[]}
          isRequired={false}
        />
      )
      expect(screen.queryByRole('combobox')).not.toBeInTheDocument()
      expect(screen.getByRole('button', { name: /add user integration/i })).toBeInTheDocument()
    })

    it('shows the no-integrations helper text', () => {
      render(<TestWrapper hasNoSettings={true} isDropdownShown={false} settings={[]} />)
      expect(
        screen.getByText(/create a user integration, or refresh the list after one is added/i)
      ).toBeInTheDocument()
    })

    it('renders the Refresh button', () => {
      render(<TestWrapper hasNoSettings={true} isDropdownShown={false} settings={[]} />)
      expect(screen.getByRole('button', { name: /refresh/i })).toBeInTheDocument()
    })
  })

  describe('isDropdownShown state', () => {
    it('renders an enabled combobox and a Refresh button', () => {
      render(
        <TestWrapper hasNoSettings={false} isDropdownShown={true} settings={[confluenceSetting]} />
      )
      expect(screen.getByRole('combobox')).toBeInTheDocument()
      expect(screen.getByRole('button', { name: /refresh/i })).toBeInTheDocument()
    })

    it('shows the has-integrations helper text', () => {
      render(
        <TestWrapper hasNoSettings={false} isDropdownShown={true} settings={[confluenceSetting]} />
      )
      expect(
        screen.getByText(/choose an existing integration, or add a new one and refresh the list/i)
      ).toBeInTheDocument()
    })
  })

  describe('Refresh button', () => {
    it('calls resetIsSettingsIndexed then indexSettings when clicked', async () => {
      const user = userEvent.setup()
      render(<TestWrapper hasNoSettings={true} isDropdownShown={false} settings={[]} />)
      await user.click(screen.getByRole('button', { name: /refresh/i }))
      await waitFor(() => {
        expect(userSettingsStore.resetIsSettingsIndexed).toHaveBeenCalledOnce()
        expect(userSettingsStore.indexSettings).toHaveBeenCalledOnce()
      })
    })

    it('shows an error toast and re-enables the button when indexSettings rejects', async () => {
      vi.mocked(userSettingsStore.indexSettings).mockRejectedValueOnce(new Error('network error'))
      const user = userEvent.setup()
      render(<TestWrapper hasNoSettings={true} isDropdownShown={false} settings={[]} />)
      const btn = screen.getByRole('button', { name: /refresh/i })
      await user.click(btn)
      await waitFor(() => {
        expect(toaster.error).toHaveBeenCalledOnce()
        expect(btn).not.toBeDisabled()
      })
    })
  })

  describe('button alignment heights', () => {
    it('Refresh button carries h-8 class (not !h-8) for items-end alignment', () => {
      render(<TestWrapper hasNoSettings={true} isDropdownShown={false} settings={[]} />)
      const refreshBtn = screen.getByRole('button', { name: /refresh/i })
      expect(refreshBtn).toHaveClass('h-8')
      expect(refreshBtn).not.toHaveClass('!h-8')
    })

    it('Add User Integration button carries h-8 class to match Refresh button height', () => {
      render(
        <TestWrapper
          hasNoSettings={true}
          isDropdownShown={false}
          settings={[]}
          isRequired={false}
        />
      )
      const addBtn = screen.getByRole('button', { name: /add user integration/i })
      expect(addBtn).toHaveClass('h-8')
    })
  })
})
