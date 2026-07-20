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

import PageLayout from '../PageLayout'

describe('PageLayout', () => {
  it('should render title only when provided', () => {
    render(
      <PageLayout title="Test Title">
        <div>Content</div>
      </PageLayout>
    )
    expect(screen.getByRole('heading', { level: 1, name: 'Test Title' })).toBeInTheDocument()
  })

  it('should render subtitle below title when provided', () => {
    render(
      <PageLayout title="Test Title" subtitle="Test Subtitle">
        <div>Content</div>
      </PageLayout>
    )
    expect(screen.getByRole('heading', { level: 1, name: 'Test Title' })).toBeInTheDocument()
    expect(screen.getByText('Test Subtitle')).toBeInTheDocument()
  })

  it('should render content in the scrollable area', () => {
    render(
      <PageLayout title="Test Title">
        <div>Test Content</div>
      </PageLayout>
    )
    expect(screen.getByText('Test Content')).toBeInTheDocument()
  })

  it('should not render subtitle element if subtitle is not provided', () => {
    const { container } = render(
      <PageLayout title="Test Title">
        <div>Content</div>
      </PageLayout>
    )
    // Should not have a second small text element in header for subtitle
    const headerDiv = container.querySelector('[class*="min-h-layout-header"]')
    expect(headerDiv).toBeInTheDocument()
    // Verify only title is rendered, not a subtitle
    expect(screen.getByText('Test Title')).toBeInTheDocument()
    expect(screen.queryByText('undefined')).not.toBeInTheDocument()
  })
})
