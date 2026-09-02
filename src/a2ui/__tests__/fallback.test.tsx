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
import { describe, expect, it } from 'vitest'

import { A2uiFallback } from '@/a2ui/fallback'

describe('A2uiFallback', () => {
  it('renders a plain-text placeholder naming the unsupported component', () => {
    render(<A2uiFallback componentType="FancyChart" />)
    const fallback = screen.getByTestId('a2ui-fallback')
    expect(fallback).toHaveTextContent('FancyChart')
  })

  it('renders a generic placeholder when the component type is unknown', () => {
    render(<A2uiFallback />)
    expect(screen.getByTestId('a2ui-fallback')).toHaveTextContent(/interactive element/i)
  })

  it('renders no interactive controls (safe text-only degradation)', () => {
    render(<A2uiFallback componentType="Broken" />)
    expect(screen.queryByRole('button')).not.toBeInTheDocument()
    expect(screen.queryByRole('textbox')).not.toBeInTheDocument()
  })
})
