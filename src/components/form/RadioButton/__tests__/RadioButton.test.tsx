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

import { primeReactPtOptions } from '@/constants/theme'

import RadioButton from '../RadioButton'

// jsdom does not compute Tailwind CSS, so these tests prove the focus-ring class is EMITTED
// by the component, not that the rendered ring achieves WCAG 3:1 contrast. Browser measurement
// is required for contrast verification.
describe('RadioButton accessibility', () => {
  it('emits peer class on input and peer-focus-visible ring-border-accent on box (WCAG 2.4.7)', () => {
    const { container } = render(
      <PrimeReactProvider value={primeReactPtOptions}>
        <RadioButton inputId="test-radio" label="Option A" />
      </PrimeReactProvider>
    )

    const box = container.querySelector('[data-pc-section="box"]')
    expect(box).not.toBeNull()

    // Fix: box must carry the focus ring class
    expect(box!.className).toContain('peer-focus-visible:ring-border-accent')

    // Fix: input must carry the peer class so the sibling variant activates
    const input = container.querySelector('input[type="radio"]')
    expect(input?.className).toContain('peer')

    // peer-* variant is sibling-order dependent: input must precede box in the DOM
    expect(input?.nextElementSibling).toBe(box)
  })
})
