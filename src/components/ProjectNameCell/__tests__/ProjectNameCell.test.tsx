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

import { render, screen } from '@testing-library/react'
import { describe, it, expect, beforeEach, vi } from 'vitest'

import ProjectNameCell from '../ProjectNameCell'

const { mockDisplayNames } = vi.hoisted(() => ({ mockDisplayNames: new Map<string, string>() }))

vi.mock('@/hooks/useProjectDisplayNames', () => ({
  useProjectDisplayNames: () => mockDisplayNames,
}))

describe('ProjectNameCell', () => {
  beforeEach(() => {
    mockDisplayNames.clear()
  })

  it('renders the technical project name', () => {
    render(<ProjectNameCell projectName="ssg-test" />)
    expect(screen.getByText('ssg-test')).toBeTruthy()
  })

  it('shows the display name as a react-tooltip hint when the project has one', () => {
    mockDisplayNames.set('ssg-test', 'My Test')
    render(<ProjectNameCell projectName="ssg-test" />)

    const cell = screen.getByText('ssg-test')
    expect(cell.tagName).toBe('SPAN')
    expect(cell.getAttribute('data-tooltip-id')).toBe('react-tooltip')
    expect(cell.getAttribute('data-tooltip-content')).toBe('My Test')
  })

  it('adds no tooltip attributes when the project has no display name', () => {
    render(<ProjectNameCell projectName="ssg-test" />)

    const cell = screen.getByText('ssg-test')
    expect(cell.getAttribute('data-tooltip-id')).toBeNull()
    expect(cell.getAttribute('data-tooltip-content')).toBeNull()
  })
})
