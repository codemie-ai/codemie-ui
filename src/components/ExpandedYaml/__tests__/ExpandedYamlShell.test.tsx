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

import { render, screen, fireEvent, cleanup } from '@testing-library/react'
import { describe, it, expect, vi, afterEach } from 'vitest'

import ExpandedYamlShell from '../ExpandedYamlShell'

vi.mock('@/assets/icons/collapse.svg?react', () => ({ default: () => null }))

afterEach(cleanup)

describe('ExpandedYamlShell', () => {
  it('renders the YAML Configuration label and the children', () => {
    render(
      <ExpandedYamlShell visible onCollapse={vi.fn()}>
        <div>body content</div>
      </ExpandedYamlShell>
    )

    expect(screen.getByText('YAML Configuration')).toBeInTheDocument()
    expect(screen.getByText('body content')).toBeInTheDocument()
  })

  it('calls onCollapse when the Collapse button is clicked', () => {
    const onCollapse = vi.fn()
    render(
      <ExpandedYamlShell visible onCollapse={onCollapse}>
        <div>body</div>
      </ExpandedYamlShell>
    )

    fireEvent.click(screen.getByRole('button', { name: /Collapse/ }))
    expect(onCollapse).toHaveBeenCalledTimes(1)
  })

  it('has no close (X) button', () => {
    render(
      <ExpandedYamlShell visible onCollapse={vi.fn()}>
        <div>body</div>
      </ExpandedYamlShell>
    )

    expect(screen.queryByRole('button', { name: /close/i })).not.toBeInTheDocument()
  })

  it('calls onCollapse when Escape is pressed', () => {
    const onCollapse = vi.fn()
    render(
      <ExpandedYamlShell visible onCollapse={onCollapse}>
        <div>body</div>
      </ExpandedYamlShell>
    )

    fireEvent.keyDown(document, { key: 'Escape', code: 'Escape' })
    expect(onCollapse).toHaveBeenCalled()
  })

  it('renders nothing when not visible', () => {
    render(
      <ExpandedYamlShell visible={false} onCollapse={vi.fn()}>
        <div>body</div>
      </ExpandedYamlShell>
    )

    expect(screen.queryByText('YAML Configuration')).not.toBeInTheDocument()
    expect(screen.queryByText('body')).not.toBeInTheDocument()
  })
})
