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
import { beforeEach, describe, expect, it } from 'vitest'

import { responseReadyStore } from '@/store/responseReady'

import ResponseReadyAnnouncer from '../ResponseReadyAnnouncer'

describe('ResponseReadyAnnouncer', () => {
  beforeEach(() => {
    responseReadyStore.pending = false
  })

  it('keeps the live region mounted with no text while no response is pending', () => {
    render(<ResponseReadyAnnouncer />)
    const status = screen.getByRole('status')
    expect(status).toHaveTextContent('')
  })

  it('announces politely while a response is pending', () => {
    responseReadyStore.pending = true
    render(<ResponseReadyAnnouncer />)
    const status = screen.getByRole('status')
    expect(status).toHaveTextContent('AI response ready')
  })
})
