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
import { createRef } from 'react'
import { describe, it, expect, vi } from 'vitest'

import LogoUrlInputField from '../LogoUrlInputField'

describe('LogoUrlInputField', () => {
  it('forwards inputRef to the URL input so form validation can focus it', () => {
    const ref = createRef<HTMLInputElement>()

    render(<LogoUrlInputField value="" onChange={vi.fn()} onBlur={vi.fn()} inputRef={ref} />)

    expect(ref.current).toBeInstanceOf(HTMLInputElement)
    expect(ref.current?.placeholder).toBe('https://example.com/logo.jpg')
  })
})
