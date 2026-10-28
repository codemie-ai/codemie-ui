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

it('renders verified pill with correct text and no status role', () => {
  render(<AssistantStatusBadge status="verified" />)
  const pill = screen.getByTestId('assistant-status-badge')
  expect(pill).toHaveTextContent('✓ VERIFIED')
  expect(pill).toHaveAttribute('data-status', 'verified')
  // role=status would collide with the card's usage counter in harness locators
  expect(screen.queryByRole('status')).not.toBeInTheDocument()
})
