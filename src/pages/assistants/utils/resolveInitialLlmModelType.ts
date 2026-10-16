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

import { Assistant } from '@/types/entity/assistant'

// A stale `llm_model_type` seeded into the form made an existing assistant
// show its old model instead of the project's current default, while a
// brand-new assistant (whose `effective_llm_model_source` is unset) never
// had a stale value to begin with. Treating `project_default` as "no
// explicit pick" lets `LLMSelector` fall through to the live default it
// already resolves from `useProjectLLMModels`.
export const resolveInitialLlmModelType = (
  assistant?: Pick<Assistant, 'llm_model_type' | 'effective_llm_model_source'> | null
): string => {
  if (assistant?.effective_llm_model_source === 'project_default') return ''
  return assistant?.llm_model_type ?? ''
}
