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

import { AssistantType } from '@/constants/assistants'
import { AssistantData } from '@/types/entity/conversation'

export interface AssistantFeatures {
  fileAttachment: boolean
  modelSelector: boolean
  skills: boolean
  tools: boolean
  usageDetails: boolean
  workspace: boolean
  clone: boolean
}

const DEFAULT_FEATURES: AssistantFeatures = {
  fileAttachment: true,
  modelSelector: true,
  skills: true,
  tools: true,
  usageDetails: true,
  workspace: true,
  clone: true,
}

const FEATURE_OVERRIDES: Partial<Record<AssistantType, Partial<AssistantFeatures>>> = {
  [AssistantType.A2A]: {
    clone: false,
  },
  [AssistantType.BEDROCK]: {
    clone: false,
  },
  [AssistantType.BEDROCK_AGENTCORE_RUNTIME]: {
    fileAttachment: false,
    modelSelector: false,
    skills: false,
    tools: false,
    usageDetails: false,
    workspace: false,
    clone: false,
  },
}

export function useAssistantFeatures(assistants: AssistantData[]): AssistantFeatures {
  return assistants.reduce<AssistantFeatures>(
    (acc, { type }) => {
      const overrides = FEATURE_OVERRIDES[type as AssistantType]
      if (!overrides) return acc
      return {
        fileAttachment: acc.fileAttachment && (overrides.fileAttachment ?? true),
        modelSelector: acc.modelSelector && (overrides.modelSelector ?? true),
        skills: acc.skills && (overrides.skills ?? true),
        tools: acc.tools && (overrides.tools ?? true),
        usageDetails: acc.usageDetails && (overrides.usageDetails ?? true),
        workspace: acc.workspace && (overrides.workspace ?? true),
        clone: acc.clone && (overrides.clone ?? true),
      }
    },
    { ...DEFAULT_FEATURES }
  )
}
