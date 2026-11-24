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
import { describe, expect, it, vi } from 'vitest'

import ExpandableTextarea from '../ExpandableTextarea'

describe('ExpandableTextarea', () => {
  it('passes the warning through to the textarea', () => {
    render(<ExpandableTextarea id="body" value="" onChange={vi.fn()} warning="Looks suspicious" />)

    expect(screen.getByText('Looks suspicious')).toHaveClass('text-aborted-primary')
  })
})
