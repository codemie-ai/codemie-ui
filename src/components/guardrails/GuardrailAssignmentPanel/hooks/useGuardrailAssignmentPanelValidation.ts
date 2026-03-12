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

import { UseFormTrigger, UseFormGetValues, FieldValues, Path } from 'react-hook-form'

type GuardrailAssignmentItem = {
  guardrail_id: string
  mode: string | null
  source: string | null
}

export const useGuardrailPanelValidation = <TFormSchema extends FieldValues = FieldValues>(
  trigger: UseFormTrigger<TFormSchema>,
  getValues: UseFormGetValues<TFormSchema>
) => {
  const validateCompletedItems = async () => {
    const assignments = (getValues('guardrail_assignments' as any) ??
      []) as GuardrailAssignmentItem[]
    const completedIndices: number[] = []

    for (const [index, assignment] of assignments.entries()) {
      if (assignment.guardrail_id && assignment.mode && assignment.source) {
        completedIndices.push(index)
      }
    }

    if (completedIndices.length > 0) {
      await Promise.all(
        completedIndices.map((index) =>
          trigger(`guardrail_assignments.${index}` as Path<TFormSchema>)
        )
      )
    }
  }

  return { validateCompletedItems }
}
