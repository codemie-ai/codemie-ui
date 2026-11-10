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
import { FC } from 'react'
import { useForm, UseFormSetValue } from 'react-hook-form'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import { useFeatureFlag } from '@/hooks/useFeatureFlags'

import { FormValues } from '../../hooks/useEditPopupForm'
import IndexTypeSharePoint from '../IndexTypeSharePoint'

vi.mock('@/hooks/useFeatureFlags', () => ({
  useFeatureFlag: vi.fn(),
}))

const onAuthMethodChangeSpy = vi.fn()

vi.mock('../../hooks/useSharePointOAuth', () => ({
  useSharePointOAuth: () => ({
    oauthStatus: 'idle',
    oauthUsername: '',
    oauthError: '',
    deviceCode: null,
    handleSignIn: vi.fn(),
    stopPolling: vi.fn(),
    onAuthMethodChange: onAuthMethodChangeSpy,
    initForEditMode: vi.fn(),
  }),
}))

vi.mock('../shared/useIntegrationManager', () => ({
  useIntegrationManager: () => ({
    showIntegrationPopup: false,
    handleIntegrationSuccess: vi.fn(),
    handleIntegrationCancel: vi.fn(),
    openIntegrationPopup: vi.fn(),
  }),
}))

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

const setValueSpy = vi.fn()

const TestWrapper: FC = () => {
  const { control, setValue, watch } = useForm<FormValues>({
    defaultValues: {
      sharepointAuthType: 'oauth_codemie',
      isEditing: true,
    } as Partial<FormValues>,
  })

  const spiedSetValue: UseFormSetValue<FormValues> = (...args) => {
    setValueSpy(...args)
    return setValue(...args)
  }

  return (
    <IndexTypeSharePoint
      errors={{}}
      hasNoSettings={() => false}
      value="sharepoint"
      projectName="test-project"
      isDropdownShown={() => false}
      control={control}
      filteredSettings={{}}
      embeddingModels={[]}
      setValue={spiedSetValue}
      watch={watch}
    />
  )
}

describe('IndexTypeSharePoint — PKCE availability', () => {
  beforeEach(() => {
    setValueSpy.mockClear()
    onAuthMethodChangeSpy.mockClear()
  })

  it('auto-switches an existing oauth_codemie selection to integration once PKCE is loaded and disabled', () => {
    vi.mocked(useFeatureFlag).mockReturnValue([false, true])

    render(<TestWrapper />)

    expect(screen.queryByText('Sign in with Microsoft (CodeMie Project)')).not.toBeInTheDocument()
    expect(screen.getByRole('button', { name: /add user integration/i })).toBeInTheDocument()
    expect(setValueSpy).toHaveBeenCalledWith('sharepointAuthType', 'integration')
  })

  it('tears down the outgoing OAuth method via onAuthMethodChange when auto-correcting', () => {
    vi.mocked(useFeatureFlag).mockReturnValue([false, true])

    render(<TestWrapper />)

    expect(onAuthMethodChangeSpy).toHaveBeenCalledWith('oauth_codemie', 'integration')
  })

  it('leaves an existing oauth_codemie selection untouched when PKCE is enabled', () => {
    vi.mocked(useFeatureFlag).mockReturnValue([true, true])

    render(<TestWrapper />)

    expect(screen.getByText('Sign in with Microsoft (CodeMie Project)')).toBeInTheDocument()
    expect(setValueSpy).not.toHaveBeenCalledWith('sharepointAuthType', 'integration')
  })

  it('does not auto-switch while the PKCE flag is still loading (transient false)', () => {
    vi.mocked(useFeatureFlag).mockReturnValue([false, false])

    render(<TestWrapper />)

    expect(setValueSpy).not.toHaveBeenCalledWith('sharepointAuthType', 'integration')
  })
})
