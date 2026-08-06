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

import { render } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'

import ChatHistory from '../ChatHistory'

vi.mock('../ChatHistoryGroup', () => ({
  default: () => <div data-testid="history-group" />,
}))

vi.mock('../hooks/useChatScroll', () => ({
  useChatScroll: vi.fn(),
}))

vi.mock('../hooks/useChatInfiniteScroll', () => ({
  useChatInfiniteScroll: () => ({
    refs: { rootRef: vi.fn(), sentryRef: { current: null } },
    visibleHistory: [],
    hasMoreMessages: false,
    lastMessageIndex: 0,
  }),
}))

describe('ChatHistory scrollbar classes', () => {
  it('uses scrollbar-gutter-edge (not scrollbar-gutter) on the scroll container', () => {
    const { container } = render(<ChatHistory />)
    const scrollDiv = container.firstChild as HTMLElement

    expect(scrollDiv.classList.contains('scrollbar-gutter-edge')).toBe(true)
    expect(scrollDiv.classList.contains('scrollbar-gutter')).toBe(false)
  })
})
