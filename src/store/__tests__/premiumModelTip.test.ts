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

import { describe, it, expect, vi, beforeEach } from 'vitest'

import { premiumModelTipStore, PENDING_CHAT_KEY } from '../premiumModelTip'

vi.mock('valtio', () => ({ proxy: vi.fn((obj) => obj) }))

beforeEach(() => {
  premiumModelTipStore.dismissedKeys = {}
})

describe('premiumModelTipStore.buildKey', () => {
  it('returns null when the model value is falsy', () => {
    expect(premiumModelTipStore.buildKey('c1', '')).toBeNull()
    expect(premiumModelTipStore.buildKey('c1', null)).toBeNull()
    expect(premiumModelTipStore.buildKey('c1', undefined)).toBeNull()
  })

  it('substitutes the pending sentinel when the chat id is falsy', () => {
    expect(premiumModelTipStore.buildKey('', 'gpt-5')).toBe(`${PENDING_CHAT_KEY}:gpt-5`)
    expect(premiumModelTipStore.buildKey(null, 'gpt-5')).toBe(`${PENDING_CHAT_KEY}:gpt-5`)
  })

  it('builds a chat-scoped key for a saved chat', () => {
    expect(premiumModelTipStore.buildKey('c1', 'gpt-5')).toBe('c1:gpt-5')
  })
})

describe('premiumModelTipStore.dismiss / isDismissed', () => {
  it('marks a key dismissed', () => {
    premiumModelTipStore.dismiss('c1:gpt-5')

    expect(premiumModelTipStore.isDismissed('c1:gpt-5')).toBe(true)
  })

  it('reports an undismissed key as false', () => {
    expect(premiumModelTipStore.isDismissed('c1:gpt-5')).toBe(false)
  })

  it('never mutates state for a null key (CR-002)', () => {
    premiumModelTipStore.dismiss(null)

    expect(premiumModelTipStore.dismissedKeys).toEqual({})
    expect(premiumModelTipStore.isDismissed(null)).toBe(false)
  })
})

describe('premiumModelTipStore.clearPendingDismissals', () => {
  it('removes only pending entries and leaves real-chat entries intact', () => {
    premiumModelTipStore.dismiss(`${PENDING_CHAT_KEY}:gpt-5`)
    premiumModelTipStore.dismiss('c9:gpt-5')

    premiumModelTipStore.clearPendingDismissals()

    expect(premiumModelTipStore.dismissedKeys).toEqual({ 'c9:gpt-5': true })
  })
})

describe('premiumModelTipStore.promotePendingDismissals', () => {
  it('re-keys pending entries to the new chat id and drops the pending ones', () => {
    premiumModelTipStore.dismiss(`${PENDING_CHAT_KEY}:gpt-5`)

    premiumModelTipStore.promotePendingDismissals('c1')

    expect(premiumModelTipStore.dismissedKeys).toEqual({ 'c1:gpt-5': true })
  })

  it('leaves dismissals recorded for other real chats untouched', () => {
    premiumModelTipStore.dismiss(`${PENDING_CHAT_KEY}:gpt-5`)
    premiumModelTipStore.dismiss('c9:gpt-5')

    premiumModelTipStore.promotePendingDismissals('c1')

    expect(premiumModelTipStore.dismissedKeys).toEqual({ 'c1:gpt-5': true, 'c9:gpt-5': true })
  })
})
