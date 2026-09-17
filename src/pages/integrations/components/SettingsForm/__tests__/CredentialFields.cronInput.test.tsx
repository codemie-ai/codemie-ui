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
import userEvent from '@testing-library/user-event'
import { useForm } from 'react-hook-form'
import { describe, it, expect, vi } from 'vitest'

import { CredentialComponentType, CredentialFieldConfig } from '@/types/settingsUI'

import CredentialFields from '../CredentialFields'

vi.mock('../hooks/useResourceOptions', () => ({
  useResourceOptions: vi.fn().mockReturnValue({ options: [], loading: false }),
}))

const cronField: Record<string, CredentialFieldConfig> = {
  schedule: {
    type: CredentialComponentType.cronInput,
    placeholder: 'Cron expression',
  },
}

function Wrapper({
  defaultValue = '',
  timezone = '',
}: Readonly<{ defaultValue?: string; timezone?: string }>) {
  const { control } = useForm({ defaultValues: { schedule: defaultValue, timezone } })
  return <CredentialFields control={control as any} credentialFields={cronField} />
}

describe('CredentialFields — cronInput', () => {
  it('shows no preview before blur', () => {
    render(<Wrapper />)
    expect(screen.queryByRole('status')).toBeNull()
  })

  it('shows no preview when blurring an empty field', async () => {
    const user = userEvent.setup()
    render(<Wrapper />)
    const input = screen.getByRole('textbox')
    await user.click(input)
    await user.tab()
    expect(screen.queryByRole('status')).toBeNull()
  })

  it('shows human-readable preview after blur on valid cron', async () => {
    const user = userEvent.setup()
    render(<Wrapper />)
    const input = screen.getByRole('textbox')
    await user.clear(input)
    await user.type(input, '0 * * * *')
    await user.tab()
    expect(await screen.findByRole('status')).toHaveTextContent('Every hour')
  })

  it('shows next run line in hint after blur on valid cron', async () => {
    const user = userEvent.setup()
    render(<Wrapper />)
    const input = screen.getByRole('textbox')
    await user.type(input, '0 * * * *')
    await user.tab()
    const hint = await screen.findByRole('status')
    expect(hint).toHaveTextContent('Every hour')
    expect(hint).toHaveTextContent('Next run:')
  })

  it('shows no preview after blur on invalid cron', async () => {
    const user = userEvent.setup()
    render(<Wrapper />)
    const input = screen.getByRole('textbox')
    await user.type(input, 'not-a-cron')
    await user.tab()
    expect(screen.queryByRole('status')).toBeNull()
  })
})
