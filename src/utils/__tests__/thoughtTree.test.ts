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

import { describe, expect, it } from 'vitest'

import {
  s5BatchPausedConversation,
  s5FirstPendingId,
  s5SecondStepId,
  s6PausedConversation,
  s6WaitingId,
} from '@/store/__tests__/fixtures/toolCallResume.fixtures'
import { ToolCallAction } from '@/types/chatGeneration'
import { ChatMessage, Thought } from '@/types/entity/conversation'

import {
  canDecide,
  collectWaitingSteps,
  findPath,
  findThought,
  nextUndecidedStep,
} from '../thoughtTree'

const t = (id: string, extra: Partial<Thought> = {}): Thought => ({
  id,
  message: id,
  in_progress: false,
  ...extra,
})

const S = t('S', { interrupted: true })
const O2 = t('O2', { children: [S] })
const O = t('O', { children: [O2] })
const tree = [t('X'), O]

const msg = (extra: Partial<ChatMessage> = {}) => ({ thoughts: tree, ...extra } as ChatMessage)

describe('thoughtTree', () => {
  it('findPath returns root..target', () => {
    expect(findPath(tree, 'S').map((x) => x.id)).toEqual(['O', 'O2', 'S'])
    expect(findPath(tree, 'nope')).toEqual([])
    expect(findPath(tree, undefined)).toEqual([])
    expect(findPath(undefined, 'S')).toEqual([])
  })

  it('findThought finds at any depth', () => {
    expect(findThought(tree, 'S')).toBe(S)
    expect(findThought(tree, 'zzz')).toBeNull()
  })

  it('collectWaitingSteps returns every interrupted step at any depth, depth-first', () => {
    expect(collectWaitingSteps(s6PausedConversation.thoughts).map((x) => x.id)).toEqual([
      s6WaitingId,
    ])
    expect(collectWaitingSteps(s5BatchPausedConversation.thoughts).map((x) => x.id)).toEqual([
      s5FirstPendingId,
      s5SecondStepId,
    ])
    expect(collectWaitingSteps([t('X')])).toEqual([])
    expect(collectWaitingSteps(undefined)).toEqual([])
  })

  it('nextUndecidedStep wraps to the first undecided step and skips chosen ones', () => {
    const waiting = collectWaitingSteps(s5BatchPausedConversation.thoughts)
    expect(nextUndecidedStep(waiting, {}, s5FirstPendingId)?.id).toBe(s5SecondStepId)
    expect(nextUndecidedStep(waiting, {}, s5SecondStepId)?.id).toBe(s5FirstPendingId)
    expect(
      nextUndecidedStep(waiting, { [s5FirstPendingId]: ToolCallAction.ALLOW }, s5SecondStepId)
    ).toBeNull()
    expect(nextUndecidedStep([waiting[0]], {}, s5FirstPendingId)).toBeNull()
  })

  it('canDecide is false while streaming or in progress', () => {
    expect(canDecide(msg())).toBe(true)
    expect(canDecide(msg({ stream: {} as any }))).toBe(false)
    expect(canDecide(msg({ inProgress: true }))).toBe(false)
  })
})
