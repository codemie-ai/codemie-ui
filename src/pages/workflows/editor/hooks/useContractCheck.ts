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
import isEqual from 'lodash/isEqual'
import omit from 'lodash/omit'
import {
  Dispatch,
  RefObject,
  SetStateAction,
  useCallback,
  useEffect,
  useRef,
  useState,
} from 'react'

import type { WorkflowFormRef } from '@/pages/workflows/components/WorkflowForm'
import {
  contractOutcomeStore,
  isTokenCurrent,
  nextRequestToken,
  OutcomeContext,
} from '@/store/contractOutcome'
import { workflowsStore } from '@/store/workflows'
import { WorkflowIssue } from '@/types/entity'
import API from '@/utils/api'
import toaster from '@/utils/toaster'
import {
  parseRejection,
  processBackendError,
} from '@/utils/workflowEditor/helpers/backendErrorHandler'
import {
  formatCoverage,
  parseContractOutcome,
  ParsedContractOutcome,
} from '@/utils/workflowEditor/helpers/contractProtocol'
import { notifyAboutWarnings } from '@/utils/workflowWarnings'

import { useIssuesOutcome } from './useIssuesOutcome'

export const CHECK_TIMEOUT_MS = 30_000

const HTTP_BAD_REQUEST = 400
const BACKEND_MESSAGE_STATUSES = [403, 404, 410]

type CheckForm = Pick<
  WorkflowFormRef,
  | 'getSubmitValues'
  | 'getFormValues'
  | 'openIssuesPanel'
  | 'closeIssuesPanel'
  | 'clearAllResolvedFields'
  | 'hasUnsavedChanges'
>

interface UseContractCheckArgs {
  formRef: RefObject<CheckForm | null>
  /** Edit page: validates `/{id}/validate`. New page: omitted, validates the id-less endpoint. */
  workflowId?: string
  /** Contract outcome slot: the workflow id, or 'new'. */
  outcomeKey: string
  setIssues?: Dispatch<SetStateAction<WorkflowIssue[] | null>>
}

/** The version history is not part of what Check validates, and a save refreshes it meanwhile. */
const checkedValues = (values: unknown) => omit(values as object, 'yaml_config_history')

const NOT_ANALYSED_LINE = 'Contracts were not analysed'

const unverifiedStateCount = (issues: WorkflowIssue[]) =>
  new Set(issues.map((issue) => issue.stateId ?? issue.id)).size

/** Dry-runs the open workflow against the backend and shows the result without saving. */
export const useContractCheck = ({
  formRef,
  workflowId,
  outcomeKey,
  setIssues,
}: UseContractCheckArgs) => {
  const [isChecking, setIsChecking] = useState(false)
  const abortRef = useRef<AbortController | null>(null)
  const mountedRef = useRef(true)

  useEffect(() => {
    mountedRef.current = true
    return () => {
      mountedRef.current = false
      abortRef.current?.abort()
    }
  }, [])

  const { showIssues: showOutcome, clearIssues } = useIssuesOutcome({
    formRef,
    outcomeKey,
    setIssues,
  })

  /**
   * "Changes not saved yet" only when there is something unsaved: always on the new page, and on
   * the edit page when the form holds edits. Otherwise a "saved" note stays as it was.
   */
  const resultContext = (): OutcomeContext | undefined => {
    if (!workflowId || formRef.current?.hasUnsavedChanges() !== false) return 'not-saved'
    const previous = contractOutcomeStore.outcome
    const isSavedNote =
      previous?.key === outcomeKey &&
      (previous.context === 'saved' || previous.context === 'created')
    return isSavedNote ? previous.context : undefined
  }

  const showIssues = (parsed: ParsedContractOutcome) => showOutcome(parsed, resultContext())

  const showResult = (parsed: ParsedContractOutcome) => {
    const { issues, coverage, truncated = 0 } = parsed
    if (issues.length === 0 && truncated > 0) {
      // The backend cut off entries of unknown severity: not a clean result.
      showIssues(parsed)
      toaster.info('Check found warnings that could not be listed')
      return
    }
    if (issues.length === 0) {
      clearIssues()
      // No coverage means the backend did not link contracts (its flag is off), so say so.
      toaster.success(
        `No issues found<br>${coverage?.analysed ? formatCoverage(coverage) : NOT_ANALYSED_LINE}`
      )
      return
    }

    showIssues(parsed)
    if (issues.every((issue) => issue.outcome === 'UNVERIFIED')) {
      toaster.info(`${unverifiedStateCount(issues)} states could not be verified`)
    }
  }

  const showFailure = (error: any) => {
    const status = error?.status
    const parsedError = error?.parsedError

    const rejected = status === HTTP_BAD_REQUEST && parsedError ? parseRejection(parsedError) : null
    if (rejected) {
      showIssues(rejected)
      return
    }

    if (parsedError && (status === HTTP_BAD_REQUEST || BACKEND_MESSAGE_STATUSES.includes(status))) {
      toaster.error(escape(processBackendError(parsedError).generalError ?? 'Check failed'))
      return
    }

    API.handleError(
      { error: parsedError ?? { message: error?.message || 'Failed to check the workflow' } },
      true,
      true
    )
  }

  const check = useCallback(async () => {
    if (!formRef.current) return
    const body = await formRef.current.getSubmitValues()
    if (!body || !mountedRef.current) return

    abortRef.current?.abort()
    const controller = new AbortController()
    abortRef.current = controller
    const token = nextRequestToken()
    let timedOut = false
    const timer = setTimeout(() => {
      timedOut = true
      controller.abort()
    }, CHECK_TIMEOUT_MS)
    setIsChecking(true)

    const isStale = () =>
      !mountedRef.current ||
      !isTokenCurrent(token) ||
      !isEqual(checkedValues(body), checkedValues(formRef.current?.getFormValues()))

    try {
      const response = await workflowsStore.validateWorkflowConfig({
        id: workflowId,
        body,
        signal: controller.signal,
      })
      // A body that stalls past the limit rejects as an abort: let the timeout handler report it.
      const json = await response.json().catch((bodyError: unknown) => {
        if (controller.signal.aborted) throw bodyError
        return undefined
      })
      if (isStale()) return

      // An unreadable body is a failed check, not a clean one: keep the previous findings.
      if (!json || typeof json !== 'object') {
        toaster.error('Check failed: the response could not be read')
        return
      }

      const parsed = parseContractOutcome(json)
      notifyAboutWarnings({ warnings: parsed.otherWarnings })
      showResult(parsed)
    } catch (error: any) {
      if (timedOut && mountedRef.current && abortRef.current === controller) {
        toaster.error('Check timed out. Try again.')
      } else if (!controller.signal.aborted && !isStale()) {
        showFailure(error)
      }
    } finally {
      clearTimeout(timer)
      if (abortRef.current === controller) {
        abortRef.current = null
        if (mountedRef.current) setIsChecking(false)
      }
    }
  }, [formRef, workflowId, outcomeKey, setIssues])

  return { check, isChecking }
}
