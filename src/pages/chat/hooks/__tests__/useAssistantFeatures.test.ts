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

import { renderHook } from '@testing-library/react'
import { describe, it, expect } from 'vitest'

import { AssistantType } from '@/constants/assistants'
import { AssistantData } from '@/types/entity/conversation'

import { useAssistantFeatures } from '../useAssistantFeatures'

const ALL_ENABLED = {
  fileAttachment: true,
  modelSelector: true,
  skills: true,
  tools: true,
  usageDetails: true,
  workspace: true,
  clone: true,
}

const AGENTCORE_FEATURES = {
  fileAttachment: false,
  modelSelector: false,
  skills: false,
  tools: false,
  usageDetails: false,
  workspace: false,
  clone: false,
}

const makeAssistant = (id: string, type: string): AssistantData => ({ id, name: id, type })

describe('useAssistantFeatures', () => {
  it('returns all features enabled when assistants array is empty', () => {
    const { result } = renderHook(() => useAssistantFeatures([]))
    expect(result.current).toEqual(ALL_ENABLED)
  })

  it('returns all features enabled for a regular assistant', () => {
    const { result } = renderHook(() =>
      useAssistantFeatures([makeAssistant('a1', AssistantType.CODEMIE)])
    )
    expect(result.current).toEqual(ALL_ENABLED)
  })

  it('returns all features enabled when assistant type is unknown', () => {
    const { result } = renderHook(() =>
      useAssistantFeatures([makeAssistant('a1', 'some_unknown_type')])
    )
    expect(result.current).toEqual(ALL_ENABLED)
  })

  it('disables all features for a BEDROCK_AGENTCORE_RUNTIME assistant', () => {
    const { result } = renderHook(() =>
      useAssistantFeatures([makeAssistant('ac1', AssistantType.BEDROCK_AGENTCORE_RUNTIME)])
    )
    expect(result.current).toEqual(AGENTCORE_FEATURES)
  })

  it('disables features when any assistant in the array is BEDROCK_AGENTCORE_RUNTIME', () => {
    const { result } = renderHook(() =>
      useAssistantFeatures([
        makeAssistant('a1', AssistantType.CODEMIE),
        makeAssistant('ac1', AssistantType.BEDROCK_AGENTCORE_RUNTIME),
      ])
    )
    expect(result.current).toEqual(AGENTCORE_FEATURES)
  })

  it('disables clone for BEDROCK assistant', () => {
    const { result } = renderHook(() =>
      useAssistantFeatures([makeAssistant('a1', AssistantType.BEDROCK)])
    )
    expect(result.current).toEqual({ ...ALL_ENABLED, clone: false })
  })

  it('disables clone when any assistant in the array is A2A', () => {
    const { result } = renderHook(() =>
      useAssistantFeatures([
        makeAssistant('a1', AssistantType.CODEMIE),
        makeAssistant('a2', AssistantType.A2A),
      ])
    )
    expect(result.current).toEqual({ ...ALL_ENABLED, clone: false })
  })

  it('returns all features enabled when all assistants are regular types', () => {
    const { result } = renderHook(() =>
      useAssistantFeatures([
        makeAssistant('a1', AssistantType.CODEMIE),
        makeAssistant('a2', AssistantType.REMOTE),
      ])
    )
    expect(result.current).toEqual(ALL_ENABLED)
  })
})
