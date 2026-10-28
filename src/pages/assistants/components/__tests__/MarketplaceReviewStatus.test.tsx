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
import { it, expect } from 'vitest'

import { AssistantStatusBadge } from '../AssistantStatusBadge'

it.each([
  ['pending', '● REVIEW'],
  ['rejected', '✕ REJECTED'],
  ['verified', '✓ VERIFIED'],
] as const)('shows label for status %s', (status, label) => {
  render(<AssistantStatusBadge status={status} />)
  expect(screen.getByTestId('assistant-status-badge')).toHaveTextContent(label)
})

it('exposes the rejection reason as text when rejected and reason present', () => {
  render(<AssistantStatusBadge status="rejected" reason="Content policy" />)
  expect(screen.getByTestId('assistant-status-badge')).toHaveTextContent('REJECTED: Content policy')
})

it('shows no reason text when rejected and reason absent', () => {
  render(<AssistantStatusBadge status="rejected" />)
  expect(screen.getByTestId('assistant-status-badge')).not.toHaveTextContent(':')
})
