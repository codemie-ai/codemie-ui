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
import { describe, it, expect } from 'vitest'

import ExpandedYamlFrame from '../ExpandedYamlFrame'

describe('ExpandedYamlFrame', () => {
  it('renders the title and actions in the header with the body content', () => {
    render(
      <ExpandedYamlFrame title="config.yaml" actions={<button>Copy</button>}>
        <div>body content</div>
      </ExpandedYamlFrame>
    )

    expect(screen.getByText('config.yaml')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Copy' })).toBeInTheDocument()
    expect(screen.getByText('body content')).toBeInTheDocument()
  })

  it('renders no header when there is no title and no actions', () => {
    const { container } = render(
      <ExpandedYamlFrame>
        <div>body content</div>
      </ExpandedYamlFrame>
    )

    expect(container.querySelector('.code-block-header')).toBeNull()
    expect(screen.getByText('body content')).toBeInTheDocument()
  })

  it('uses the red error border on the header and body when invalid', () => {
    const { container } = render(
      <ExpandedYamlFrame title="config.yaml" invalid>
        <div>body</div>
      </ExpandedYamlFrame>
    )

    expect(container.querySelector('.code-block-header')).toHaveClass('!border-failed-secondary')
    expect(container.querySelector('.rounded-b-lg')).toHaveClass('!border-failed-secondary')
  })

  it('keeps the neutral border when valid', () => {
    const { container } = render(
      <ExpandedYamlFrame title="config.yaml">
        <div>body</div>
      </ExpandedYamlFrame>
    )

    expect(container.querySelector('.rounded-b-lg')).toHaveClass(
      '!border-border-specific-panel-outline'
    )
    expect(container.querySelector('.rounded-b-lg')).not.toHaveClass('!border-failed-secondary')
  })
})
