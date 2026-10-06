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
import { PrimeReactProvider } from 'primereact/api'
import { describe, it, expect } from 'vitest'

import { Checkbox } from '@/components/form/Checkbox'
import { primeReactPtOptions } from '@/constants/theme'

// jsdom does not compute Tailwind CSS, so these tests prove the focus-ring class is EMITTED
// by the preset, not that the rendered ring achieves WCAG 3:1 contrast. Browser measurement
// is required for contrast verification.
describe('Checkbox accessibility', () => {
  it('emits peer-focus-visible ring-border-accent on the box element (WCAG 2.4.7)', () => {
    const { container } = render(
      <PrimeReactProvider value={primeReactPtOptions}>
        <Checkbox checked={false} onChange={() => {}} />
      </PrimeReactProvider>
    )

    const box = container.querySelector('[data-pc-section="box"]')
    expect(box).not.toBeNull()

    // Fix: lara preset must use ring-border-accent, not the invisible /20 variant
    expect(box!.className).toContain('peer-focus-visible:ring-border-accent')
    expect(box!.className).not.toContain('ring-border-subtle/20')

    // peer-* variant is sibling-order dependent: input must precede box in the DOM
    const input = container.querySelector('input[type="checkbox"]')
    expect(input?.nextElementSibling).toBe(box)
  })
})
