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

import { useEffect, useState } from 'react'

import { assistantsStore } from '@/store'
import { ToolStepConfigItem } from '@/types/entity/assistant'

const cache = new Map<string, Promise<ToolStepConfigItem[]>>()

const loadStepConfig = (toolName: string): Promise<ToolStepConfigItem[]> => {
  const cached = cache.get(toolName)
  if (cached) return cached

  const request = assistantsStore
    .getToolSchema(toolName)
    .then((schema) => (Array.isArray(schema?.step_config) ? schema.step_config : []))
    .catch(() => {
      cache.delete(toolName)
      return [] as ToolStepConfigItem[]
    })

  cache.set(toolName, request)
  return request
}

/**
 * Editors a tool asks for on its workflow step (`step_config` of its schema). Returns `null`
 * until the schema is loaded, so callers can tell "none" from "not known yet".
 */
export const useToolStepConfig = (toolName?: string): ToolStepConfigItem[] | null => {
  const [state, setState] = useState<{ toolName?: string; items: ToolStepConfigItem[] } | null>(
    null
  )

  useEffect(() => {
    let cancelled = false

    if (toolName) {
      loadStepConfig(toolName).then((items) => {
        if (!cancelled) setState({ toolName, items })
      })
    } else {
      setState(null)
    }

    return () => {
      cancelled = true
    }
  }, [toolName])

  return state && state.toolName === toolName ? state.items : null
}
