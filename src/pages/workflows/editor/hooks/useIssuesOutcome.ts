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

import escape from 'lodash/escape'
import { Dispatch, RefObject, SetStateAction, useCallback } from 'react'

import type { WorkflowFormRef } from '@/pages/workflows/components/WorkflowForm'
import {
  applyOutcome,
  clearOutcome,
  nextRequestToken,
  OutcomeContext,
} from '@/store/contractOutcome'
import { WorkflowIssue } from '@/types/entity'
import toaster from '@/utils/toaster'
import {
  parseRejection,
  processBackendError,
  WorkflowValidationError,
} from '@/utils/workflowEditor/helpers/backendErrorHandler'
import { ParsedContractOutcome } from '@/utils/workflowEditor/helpers/contractProtocol'

type OutcomeForm = Pick<
  WorkflowFormRef,
  'openIssuesPanel' | 'closeIssuesPanel' | 'clearAllResolvedFields'
>

interface UseIssuesOutcomeArgs {
  formRef: RefObject<OutcomeForm | null>
  /** Contract outcome slot: the workflow id, or 'new'. */
  outcomeKey: string
  setIssues?: Dispatch<SetStateAction<WorkflowIssue[] | null>>
}

/** A response body that cannot be read leaves the validation result unknown. */
export const readJsonBody = async (
  response: Response | undefined
): Promise<{ readable: boolean; body: unknown }> => {
  try {
    const body = await response?.json()
    return { readable: body !== null && typeof body === 'object', body }
  } catch {
    return { readable: false, body: undefined }
  }
}

/**
 * Shows a validation result in the issues panel, for save, Check and restore alike: issues stay on
 * the page, coverage and the context note go to the outcome store.
 */
export const useIssuesOutcome = ({ formRef, outcomeKey, setIssues }: UseIssuesOutcomeArgs) => {
  const showIssues = useCallback(
    (parsed: ParsedContractOutcome, context: OutcomeContext | undefined) => {
      applyOutcome(parsed, context, outcomeKey)
      formRef.current?.clearAllResolvedFields()
      setIssues?.(parsed.issues)
      formRef.current?.openIssuesPanel()
    },
    [formRef, outcomeKey, setIssues]
  )

  const clearIssues = useCallback(() => {
    clearOutcome(outcomeKey)
    setIssues?.(null)
    formRef.current?.clearAllResolvedFields()
    formRef.current?.closeIssuesPanel()
  }, [formRef, outcomeKey, setIssues])

  /** The rejection's issues in the panel, or its message as an error toast. */
  const showRejection = useCallback(
    (parsedError: WorkflowValidationError, context: OutcomeContext) => {
      const parsed = parseRejection(parsedError)
      if (parsed) {
        showIssues(parsed, context)
        return
      }
      const { generalError } = processBackendError(parsedError)
      toaster.error(escape(generalError ?? 'Validation returned no issue details'))
    },
    [showIssues]
  )

  /**
   * A save result is newer than any Check or restore validation still in flight. The panel closes
   * with the old findings: while the save runs, or when it fails without issue details, there is no
   * current result, and an open panel would read "No issues found".
   */
  const beginSave = useCallback(() => {
    nextRequestToken()
    clearOutcome(outcomeKey)
    setIssues?.(null)
    formRef.current?.clearAllResolvedFields()
    formRef.current?.closeIssuesPanel()
  }, [formRef, outcomeKey, setIssues])

  const showSaveFailure = useCallback(
    (error: any) => {
      if (error?.parsedError) {
        showRejection(error.parsedError, 'rejected')
      } else {
        toaster.error('Failed to save the workflow')
      }
    },
    [showRejection]
  )

  return { showIssues, clearIssues, showRejection, beginSave, showSaveFailure }
}
