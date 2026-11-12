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

import ModelMetaLine, { CLI_ONLY_MODEL_TOOLTIP } from '../ModelMetaLine'

describe('ModelMetaLine', () => {
  it('renders nothing for a plain web model', () => {
    const { container } = render(<ModelMetaLine />)
    expect(container).toBeEmptyDOMElement()
  })

  it('joins Router, Premium and CLI only in that order', () => {
    render(<ModelMetaLine isRouter isPremium cliOnly />)
    expect(screen.getByTestId('model-meta-line')).toHaveTextContent('Router · Premium · CLI only')
  })

  it('explains CLI only in its tooltip', () => {
    render(<ModelMetaLine cliOnly />)
    expect(screen.getByText('CLI only')).toHaveAttribute(
      'data-tooltip-content',
      CLI_ONLY_MODEL_TOOLTIP
    )
  })

  it('marks a CLI-only router as both', () => {
    render(<ModelMetaLine isRouter cliOnly testId="meta" />)
    expect(screen.getByTestId('meta')).toHaveTextContent('Router · CLI only')
  })
})
