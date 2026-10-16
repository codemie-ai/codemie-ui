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

import { resolveInitialLlmModelType } from '../resolveInitialLlmModelType'

describe('resolveInitialLlmModelType', () => {
  it('returns an empty string when the effective model came from the project default', () => {
    expect(
      resolveInitialLlmModelType({
        llm_model_type: 'gpt-4o',
        effective_llm_model_source: 'project_default',
      })
    ).toBe('')
  })

  it('returns the stored model type when the assistant has an explicit pick', () => {
    expect(
      resolveInitialLlmModelType({
        llm_model_type: 'gpt-4o',
        effective_llm_model_source: 'assistant',
      })
    ).toBe('gpt-4o')
  })

  it('falls back to the stored model type when the source is unknown (unsaved assistant)', () => {
    expect(
      resolveInitialLlmModelType({
        llm_model_type: 'gpt-4o',
      })
    ).toBe('gpt-4o')
  })

  it('returns an empty string for an undefined assistant', () => {
    expect(resolveInitialLlmModelType(undefined)).toBe('')
  })
})
