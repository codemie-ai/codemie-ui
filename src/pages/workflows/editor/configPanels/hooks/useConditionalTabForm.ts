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

import { useEffect, useImperativeHandle, Ref } from 'react'
import { UseFormReset } from 'react-hook-form'

export interface ConfigTabRef {
  isDirty: () => boolean
  save: () => Promise<boolean>
}

interface UseConditionalTabFormOptions<T> {
  ref: Ref<ConfigTabRef>
  isDirty: boolean
  saveData: () => Promise<boolean>
  state?: any
  getDefaultValues: (state?: any) => T
  reset: UseFormReset<any>
}

/**
 * Reusable hook for conditional/branching tab form patterns (Switch, Conditional).
 * Handles:
 * - useImperativeHandle for exposing isDirty and save methods
 * - useEffect for resetting form when state changes
 * - handleSave wrapper that closes panel on success
 */
export function useConditionalTabForm<T>({
  ref,
  isDirty,
  saveData,
  state,
  getDefaultValues,
  reset,
}: UseConditionalTabFormOptions<T>) {
  useImperativeHandle(
    ref,
    () => ({
      isDirty: () => isDirty,
      save: saveData,
    }),
    [isDirty, saveData]
  )

  useEffect(() => {
    if (state) {
      reset(getDefaultValues(state))
    }
  }, [state?.id, reset, getDefaultValues])

  const handleSave = async (onClose?: (skipDirtyCheck?: boolean) => void) => {
    const success = await saveData()
    if (success) {
      onClose?.(true)
    }
  }

  return { handleSave }
}
