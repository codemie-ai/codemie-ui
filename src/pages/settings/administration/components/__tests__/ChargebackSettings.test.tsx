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

import { fireEvent, render } from '@testing-library/react'
import { describe, it, expect, vi, beforeEach } from 'vitest'

import ChargebackSettings from '../ChargebackSettings'

const useProjectChargebackEnabled = vi.fn(() => [true, true])

vi.mock('@/hooks/useFeatureFlags', () => ({
  useProjectChargebackEnabled: () => useProjectChargebackEnabled(),
}))

const baseProps = {
  value: { chargeback_enabled: true, chargeback_attribution: 'project' as const },
  hasCostCenter: true,
  costCentersEnabled: true,
  canEdit: true,
  onChange: vi.fn(),
}

const enableToggle = () => document.getElementById('chargeback_enabled') as HTMLInputElement | null
const costCenterToggle = () =>
  document.getElementById('chargeback_use_cost_center') as HTMLInputElement | null

describe('ChargebackSettings', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    useProjectChargebackEnabled.mockReturnValue([true, true])
  })

  it('renders nothing when the feature flag is off', () => {
    useProjectChargebackEnabled.mockReturnValue([false, true])

    const { container } = render(<ChargebackSettings {...baseProps} />)

    expect(container).toBeEmptyDOMElement()
  })

  it('shows only the enable toggle when chargeback is disabled', () => {
    render(
      <ChargebackSettings
        {...baseProps}
        value={{ chargeback_enabled: false, chargeback_attribution: 'project' }}
      />
    )

    expect(enableToggle()).toBeInTheDocument()
    expect(costCenterToggle()).not.toBeInTheDocument()
  })

  it('shows the cost-center toggle off for project attribution when enabled', () => {
    render(<ChargebackSettings {...baseProps} />)

    expect(enableToggle()).toBeChecked()
    expect(costCenterToggle()).not.toBeChecked()
  })

  it('reflects cost_center attribution as the cost-center toggle being on', () => {
    render(
      <ChargebackSettings
        {...baseProps}
        value={{ chargeback_enabled: true, chargeback_attribution: 'cost_center' }}
      />
    )

    expect(costCenterToggle()).toBeChecked()
  })

  it('enabling chargeback calls onChange defaulting to project attribution', () => {
    const onChange = vi.fn()
    render(
      <ChargebackSettings
        {...baseProps}
        value={{ chargeback_enabled: false, chargeback_attribution: 'project' }}
        onChange={onChange}
      />
    )

    fireEvent.click(enableToggle()!)

    expect(onChange).toHaveBeenCalledWith({
      chargeback_enabled: true,
      chargeback_attribution: 'project',
    })
  })

  it('toggling the cost-center switch sets attribution to cost_center, then back to project', () => {
    const onChange = vi.fn()
    const { rerender } = render(<ChargebackSettings {...baseProps} onChange={onChange} />)

    fireEvent.click(costCenterToggle()!)
    expect(onChange).toHaveBeenCalledWith({
      chargeback_enabled: true,
      chargeback_attribution: 'cost_center',
    })

    rerender(
      <ChargebackSettings
        {...baseProps}
        value={{ chargeback_enabled: true, chargeback_attribution: 'cost_center' }}
        onChange={onChange}
      />
    )
    fireEvent.click(costCenterToggle()!)
    expect(onChange).toHaveBeenLastCalledWith({
      chargeback_enabled: true,
      chargeback_attribution: 'project',
    })
  })

  it('hides the cost-center toggle entirely when cost centers are disabled', () => {
    render(<ChargebackSettings {...baseProps} costCentersEnabled={false} />)

    // Chargeback is still available, but cost-center attribution is not offered.
    expect(enableToggle()).toBeInTheDocument()
    expect(costCenterToggle()).not.toBeInTheDocument()
  })

  it('disables the cost-center toggle when the project has no linked cost center', () => {
    render(<ChargebackSettings {...baseProps} hasCostCenter={false} />)

    expect(costCenterToggle()).toBeDisabled()
  })

  it('disables both toggles when canEdit is false', () => {
    render(<ChargebackSettings {...baseProps} canEdit={false} />)

    expect(enableToggle()).toBeDisabled()
    expect(costCenterToggle()).toBeDisabled()
  })
})
