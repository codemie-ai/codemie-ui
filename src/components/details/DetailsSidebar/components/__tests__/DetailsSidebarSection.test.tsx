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

import DetailsSidebarSection from '../DetailsSidebarSection'

describe('DetailsSidebarSection', () => {
  const defaultHeadline = 'Section Headline'
  const childText = 'This is the child content'
  const ChildComponent = () => <p>{childText}</p>

  it('renders the headline with its specific styles', () => {
    render(
      <DetailsSidebarSection headline={defaultHeadline}>
        <ChildComponent />
      </DetailsSidebarSection>
    )

    const headlineElement = screen.getByText(defaultHeadline)
    expect(headlineElement).toBeInTheDocument()
    expect(headlineElement.tagName).toBe('P')
    expect(headlineElement).toHaveClass('text-xs', 'font-semibold')
  })

  it('should merge itemsWrapperClassName with the default classes', () => {
    const customClass = 'my-custom-padding'

    render(
      <DetailsSidebarSection headline={defaultHeadline} itemsWrapperClassName={customClass}>
        <ChildComponent />
      </DetailsSidebarSection>
    )

    const childElement = screen.getByText(childText)
    const itemsWrapper = childElement.parentElement

    expect(itemsWrapper).not.toBeNull()
    expect(itemsWrapper).toHaveClass('flex')
    expect(itemsWrapper).toHaveClass(customClass)
  })
})
