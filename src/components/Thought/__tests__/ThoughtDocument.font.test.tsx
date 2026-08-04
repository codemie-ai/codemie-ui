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
import { describe, it, expect } from 'vitest'

import ThoughtDocument from '../ThoughtDocument'

describe('ThoughtDocument font class', () => {
  it('outer container does not carry font-geist', () => {
    const { container } = render(<ThoughtDocument title="Tool result" />)
    const root = container.firstElementChild
    expect(root?.className).not.toContain('font-geist')
  })

  it('toggle button does not carry font-geist', () => {
    const { container } = render(<ThoughtDocument title="Tool result" />)
    const button = container.querySelector('button')
    expect(button?.className).not.toContain('font-geist')
  })
})
