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

import { IssueLink } from '../IssueLink'

describe('IssueLink', () => {
  it('renders issue key and link', () => {
    render(
      <IssueLink
        issue={{
          key: 'EPMCDME-12345',
          type: 'STORY',
          link: 'https://jiraeu.epam.com/browse/EPMCDME-12345',
        }}
      />
    )

    const link = screen.getByText('EPMCDME-12345').closest('a')
    expect(link).toHaveAttribute('href', 'https://jiraeu.epam.com/browse/EPMCDME-12345')
    expect(link).toHaveAttribute('target', '_blank')
    expect(link).toHaveAttribute('rel', 'noopener noreferrer')
  })
})
