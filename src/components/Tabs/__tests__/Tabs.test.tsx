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
import { describe, it, expect } from 'vitest'

import Tabs, { Tab } from '../Tabs'

const tabs: Tab[] = [
  { id: 'first', label: 'First', element: <div>First content</div> },
  { id: 'second', label: 'Second', element: <div>Second content</div> },
  { id: 'third', label: 'Third', element: <div>Third content</div> },
]

describe('Tabs ARIA', () => {
  it('renders the tab list container with role="tablist"', () => {
    render(<Tabs tabs={tabs} activeTab="first" />)
    expect(screen.getByRole('tablist')).toBeInTheDocument()
  })

  it('marks the active tab with aria-selected="true"', () => {
    render(<Tabs tabs={tabs} activeTab="second" />)
    expect(screen.getByRole('tab', { name: 'Second' })).toHaveAttribute('aria-selected', 'true')
  })

  it('marks inactive tabs with aria-selected="false"', () => {
    render(<Tabs tabs={tabs} activeTab="second" />)
    expect(screen.getByRole('tab', { name: 'First' })).toHaveAttribute('aria-selected', 'false')
    expect(screen.getByRole('tab', { name: 'Third' })).toHaveAttribute('aria-selected', 'false')
  })

  it('updates aria-selected when switching tabs (uncontrolled)', async () => {
    const user = userEvent.setup()
    render(<Tabs tabs={tabs} />)

    const firstTab = screen.getByRole('tab', { name: 'First' })
    const secondTab = screen.getByRole('tab', { name: 'Second' })

    expect(firstTab).toHaveAttribute('aria-selected', 'true')
    expect(secondTab).toHaveAttribute('aria-selected', 'false')

    await user.click(secondTab)

    expect(firstTab).toHaveAttribute('aria-selected', 'false')
    expect(secondTab).toHaveAttribute('aria-selected', 'true')
  })
})
