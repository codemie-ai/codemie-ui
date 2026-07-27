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

import { render, screen, fireEvent } from '@testing-library/react'
import { describe, it, expect, vi } from 'vitest'

import CronScheduleInput from '../CronScheduleInput'

vi.mock('@/utils/timezone', () => ({
  getIANATimezoneOptions: () => [
    { label: 'UTC', value: 'UTC' },
    { label: 'Europe/Warsaw', value: 'Europe/Warsaw' },
  ],
}))

vi.mock('@/components/form/Autocomplete', () => ({
  default: ({ label, onChange }: { label?: string; onChange?: (v: string) => void }) => (
    <div data-testid="autocomplete">
      {label && <span>{label}</span>}
      <button data-testid="tz-select-trigger" onClick={() => onChange?.('Europe/Warsaw')}>
        select
      </button>
    </div>
  ),
}))

vi.mock('@/components/form/Select', () => ({
  default: () => <div data-testid="select" />,
}))

describe('CronScheduleInput — timezone selector', () => {
  it('shows the Timezone selector when an active schedule preset is set (hourly)', () => {
    render(
      <CronScheduleInput
        value="0 * * * *"
        onChange={vi.fn()}
        timezone="UTC"
        onTimezoneChange={vi.fn()}
      />
    )
    expect(screen.getByText('Timezone')).toBeInTheDocument()
  })

  it('hides the Timezone selector when preset is NONE (empty value)', () => {
    render(
      <CronScheduleInput value="" onChange={vi.fn()} timezone="UTC" onTimezoneChange={vi.fn()} />
    )
    expect(screen.queryByText('Timezone')).not.toBeInTheDocument()
  })

  it('shows the Timezone selector for daily preset', () => {
    render(
      <CronScheduleInput
        value="0 0 * * *"
        onChange={vi.fn()}
        timezone="Europe/Warsaw"
        onTimezoneChange={vi.fn()}
      />
    )
    expect(screen.getByText('Timezone')).toBeInTheDocument()
  })

  it('calls onTimezoneChange when user selects a timezone', () => {
    const handleChange = vi.fn()
    render(
      <CronScheduleInput
        value="0 * * * *"
        onChange={vi.fn()}
        timezone="UTC"
        onTimezoneChange={handleChange}
      />
    )
    fireEvent.click(screen.getByTestId('tz-select-trigger'))
    expect(handleChange).toHaveBeenCalledWith('Europe/Warsaw')
  })

  it('renders without timezone props (backward compat — no crash)', () => {
    expect(() => render(<CronScheduleInput value="" onChange={vi.fn()} />)).not.toThrow()
  })
})
