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
import { describe, it, expect, vi } from 'vitest'

import OAuthTestAction from '../OAuthTestAction'

// Render a marker instead of driving the real OAuth popup/poll flow.
vi.mock('../SettingsForm/OAuthTestButton', () => ({
  default: ({ provider }: { provider: string }) => (
    <div data-testid="oauth-test-button">{provider}</div>
  ),
}))
vi.mock('@/store/userSettings', () => ({ userSettingsStore: {} }))

describe('OAuthTestAction', () => {
  it.each([
    ['gitlaboauth', 'GitLab'],
    ['jiraoauth', 'Jira'],
    ['confluenceoauth', 'Confluence'],
  ])('renders the test button for %s', (credentialType, provider) => {
    render(<OAuthTestAction credentialType={credentialType} credentialValues={{}} />)
    expect(screen.getByTestId('oauth-test-button')).toHaveTextContent(provider)
  })

  it('renders nothing for a non-OAuth credential type', () => {
    const { container } = render(<OAuthTestAction credentialType="webhook" credentialValues={{}} />)
    expect(screen.queryByTestId('oauth-test-button')).toBeNull()
    expect(container).toBeEmptyDOMElement()
  })
})
