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

import { render, screen } from '@testing-library/react'
import {
  createMemoryRouter,
  isRouteErrorResponse,
  RouterProvider,
  useRouteError,
} from 'react-router'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import TermsAndConditionsPage from '../TermsAndConditionsPage'

const { mockTermsState } = vi.hoisted(() => ({
  mockTermsState: {
    isLoaded: true,
    isEnabled: true,
    content: '## Approved terms',
  } as {
    isLoaded: boolean
    isEnabled: boolean
    content?: string
  },
}))

vi.mock('../hooks/useTermsAndConditions', () => ({
  useTermsAndConditions: vi.fn(() => mockTermsState),
}))

vi.mock('@/components/Layouts/Layout', () => ({
  default: ({ children, isLoading }: { children?: React.ReactNode; isLoading?: boolean }) => (
    <main data-loading={isLoading ? 'true' : 'false'}>{children}</main>
  ),
}))

const RouteError = () => {
  const error = useRouteError()
  return (
    <div>{isRouteErrorResponse(error) && error.status === 404 ? 'Page Not Found' : 'Error'}</div>
  )
}

describe('TermsAndConditionsPage', () => {
  beforeEach(() => {
    mockTermsState.isLoaded = true
    mockTermsState.isEnabled = true
    mockTermsState.content = '## Approved terms'
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  it('shows the PageLayout loading state while config loads', () => {
    mockTermsState.isLoaded = false

    render(<TermsAndConditionsPage />)

    expect(screen.getByRole('main')).toHaveAttribute('data-loading', 'true')
  })

  it('renders the route 404 experience when the feature is disabled', async () => {
    const consoleError = vi.spyOn(console, 'error').mockImplementation(() => undefined)
    mockTermsState.isEnabled = false
    const router = createMemoryRouter(
      [
        {
          path: '/terms-and-conditions',
          element: <TermsAndConditionsPage />,
          errorElement: <RouteError />,
        },
      ],
      { initialEntries: ['/terms-and-conditions'] }
    )

    render(<RouterProvider router={router} />)

    expect(await screen.findByText('Page Not Found')).toBeInTheDocument()
    expect(consoleError).toHaveBeenCalled()
  })

  it.each([undefined, '', '   '])(
    'shows an unavailable message when enabled content is %p',
    (content) => {
      mockTermsState.content = content

      render(<TermsAndConditionsPage />)

      expect(
        screen.getByText('Terms and Conditions are currently unavailable. Please try again later.')
      ).toBeInTheDocument()
    }
  )

  it('omits the redundant configured Terms document title heading', () => {
    mockTermsState.content = '# CodeMie SaaS Terms and Conditions — Draft'

    render(<TermsAndConditionsPage />)

    expect(screen.getAllByRole('heading', { level: 1 })).toHaveLength(1)
    expect(
      screen.getByRole('heading', { level: 1, name: 'Terms and Conditions' })
    ).toBeInTheDocument()
    expect(
      screen.queryByRole('heading', {
        level: 2,
        name: 'CodeMie SaaS Terms and Conditions — Draft',
      })
    ).not.toBeInTheDocument()
  })

  it('renders configured Markdown below the page heading', () => {
    mockTermsState.content = [
      '## Budgets and Project Usage',
      '',
      'Read the [CodeMie Budget Allocation Guide](https://example.test/budget).',
    ].join('\n')

    render(<TermsAndConditionsPage />)

    expect(
      screen.getByRole('heading', { level: 2, name: 'Budgets and Project Usage' })
    ).toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'CodeMie Budget Allocation Guide' })).toHaveAttribute(
      'href',
      'https://example.test/budget'
    )
  })

  it('renders configured Markdown inside FAQ-style Terms sections', () => {
    mockTermsState.content = ['## First section', 'First body.', '', '## Second section'].join(
      '\n'
    )

    const { container } = render(<TermsAndConditionsPage />)

    expect(container.querySelector('.terms-document')).toBeInTheDocument()
    expect(container.querySelector('.terms-document__hero')).toBeInTheDocument()
    expect(container.querySelector('.terms-document__sections')).toBeInTheDocument()
    expect(container.querySelectorAll('.terms-document__section')).toHaveLength(2)
    expect(container.querySelectorAll('.terms-document__markdown')).toHaveLength(2)
  })

  it('renders escaped config Markdown line breaks as Markdown structure', () => {
    mockTermsState.content =
      '# CodeMie SaaS Terms and Conditions\\n\\n## 1. Purpose and Scope\\n\\n- EPAM internal projects;\\n- approved EPAM business activities.\\n\\nRead the [Security page](https://example.test/security).'

    render(<TermsAndConditionsPage />)

    expect(
      screen.queryByRole('heading', {
        level: 2,
        name: 'CodeMie SaaS Terms and Conditions',
      })
    ).not.toBeInTheDocument()
    expect(
      screen.getByRole('heading', { level: 2, name: '1. Purpose and Scope' })
    ).toBeInTheDocument()
    expect(screen.getByText('EPAM internal projects;')).toBeInTheDocument()
    expect(screen.getByText('approved EPAM business activities.')).toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'Security page' })).toHaveAttribute(
      'href',
      'https://example.test/security'
    )
  })

  it('does not use the checked-in draft as fallback content', () => {
    mockTermsState.content = undefined

    render(<TermsAndConditionsPage />)

    expect(screen.queryByText('Purpose and Scope')).not.toBeInTheDocument()
    expect(screen.queryByText(/ISO\/IEC 42001/)).not.toBeInTheDocument()
  })
})
