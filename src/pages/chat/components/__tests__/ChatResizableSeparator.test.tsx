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

import { render } from '@testing-library/react'
import { describe, it, expect, vi } from 'vitest'

import ChatResizableSeparator from '../ChatResizableSeparator'

vi.mock('react-resizable-panels', () => ({
  Separator: ({ children, className, ...rest }: React.HTMLAttributes<HTMLDivElement>) => (
    <div className={className} {...rest}>
      {children}
    </div>
  ),
}))

describe('ChatResizableSeparator', () => {
  it('applies dark theme overrides on the pill', () => {
    const { container } = render(<ChatResizableSeparator />)
    const pill = container.querySelector('[aria-hidden="true"]') as HTMLElement

    expect(pill).toBeInTheDocument()
    expect(pill.className).toContain('[.codemieDark_&]:bg-white/25')
    expect(pill.className).toContain('[.codemieDark_&]:group-hover:bg-white/50')
    expect(pill.className).toContain('[.codemieDark_&]:group-focus-visible:bg-white/65')
    expect(pill.className).toContain('[.codemieDark_&]:group-focus-visible:ring-white/50')
  })

  it('retains light theme base classes on the pill', () => {
    const { container } = render(<ChatResizableSeparator />)
    const pill = container.querySelector('[aria-hidden="true"]') as HTMLElement

    expect(pill.className).toContain('bg-black/20')
    expect(pill.className).toContain('group-hover:bg-black/45')
    expect(pill.className).toContain('group-focus-visible:bg-black/60')
  })
})
