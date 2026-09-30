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
import { describe, it, expect, vi, beforeEach } from 'vitest'

import Hint from '../Hint'

vi.mock('@/assets/icons/info.svg?react', () => ({
  default: (props: any) => <svg data-testid="info-icon" {...props} />,
}))

const { MockTooltip } = vi.hoisted(() => ({
  MockTooltip: vi.fn(() => null),
}))

vi.mock('@/components/Tooltip', () => ({
  default: MockTooltip,
}))

describe('Hint', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('renders nothing when hint prop is absent', () => {
    const { container } = render(<Hint id="test" />)
    expect(container.firstChild).toBeNull()
  })

  it('renders nothing when hint prop is null', () => {
    const { container } = render(<Hint id="test" hint={null} />)
    expect(container.firstChild).toBeNull()
  })

  it('renders the info icon when hint is provided', () => {
    render(<Hint id="test-hint" hint="Some tooltip text" />)
    expect(screen.getByTestId('info-icon')).toBeInTheDocument()
  })

  it('passes appendTo as a function to Tooltip', () => {
    render(<Hint id="test-hint" hint="Some tooltip text" />)
    const [[props]] = MockTooltip.mock.calls as any
    expect(typeof props.appendTo).toBe('function')
  })

  it('appendTo function returns document.body', () => {
    render(<Hint id="test-hint" hint="Some tooltip text" />)
    const [[props]] = MockTooltip.mock.calls as any
    expect(props.appendTo()).toBe(document.body)
  })

  it('does not pass appendTo="self" to Tooltip', () => {
    render(<Hint id="test-hint" hint="Some tooltip text" />)
    const [[props]] = MockTooltip.mock.calls as any
    expect(props.appendTo).not.toBe('self')
  })

  it('passes the hint text as children to Tooltip', () => {
    render(<Hint id="test-hint" hint="Hint content" />)
    const [[props]] = MockTooltip.mock.calls as any
    expect(props.children).toBe('Hint content')
  })

  it('passes the correct target selector to Tooltip', () => {
    render(<Hint id="my-hint-id" hint="text" />)
    const [[props]] = MockTooltip.mock.calls as any
    expect(props.target).toBe('#my-hint-id')
  })
})
