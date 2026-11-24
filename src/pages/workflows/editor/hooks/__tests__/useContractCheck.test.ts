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

import { act, renderHook } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import { contractOutcomeStore, nextRequestToken } from '@/store/contractOutcome'
import { workflowsStore } from '@/store/workflows'
import API from '@/utils/api'
import toaster from '@/utils/toaster'
import { notifyAboutWarnings } from '@/utils/workflowWarnings'

import { useContractCheck } from '../useContractCheck'

vi.mock('@/store/workflows', () => ({
  workflowsStore: { validateWorkflowConfig: vi.fn() },
}))
vi.mock('@/utils/api', () => ({ default: { handleError: vi.fn() } }))
vi.mock('@/utils/toaster', () => ({
  default: { info: vi.fn(), success: vi.fn(), error: vi.fn() },
}))
vi.mock('@/utils/workflowWarnings', () => ({ notifyAboutWarnings: vi.fn() }))

const validate = workflowsStore.validateWorkflowConfig as unknown as ReturnType<typeof vi.fn>

const BODY = { name: 'wf', yaml_config: 'states: []' }
const COVERAGE = {
  validated_states: 3,
  total_states: 3,
  uncovered_state_ids: [],
  analysed: true,
  cap_reached: false,
}

const contractWarning = (outcome: string, id: string) => ({
  id,
  kind: 'contract_validation',
  outcome,
  state_id: id,
  path: 'x',
  message: `${outcome} ${id}`,
})

const okResponse = (body: object) => ({ json: () => Promise.resolve(body) })
const rejection = (status: number, error: object) => ({ status, parsedError: error })

const makeForm = (overrides: Record<string, any> = {}) => ({
  getSubmitValues: vi.fn().mockResolvedValue(BODY),
  getFormValues: vi.fn().mockReturnValue(BODY),
  openIssuesPanel: vi.fn(),
  closeIssuesPanel: vi.fn(),
  clearAllResolvedFields: vi.fn(),
  // The edit page form holds edits unless a test says otherwise.
  hasUnsavedChanges: vi.fn().mockReturnValue(true),
  ...overrides,
})

const setup = (form = makeForm(), workflowId: string | null = 'wf-1') => {
  const setIssues = vi.fn()
  const hook = renderHook(() =>
    useContractCheck({
      formRef: { current: form as any },
      workflowId: workflowId ?? undefined,
      outcomeKey: workflowId ?? 'new',
      setIssues,
    })
  )
  return { ...hook, form, setIssues }
}

/** The issues the hook last handed to the page. */
const shownIssues = (setIssues: ReturnType<typeof vi.fn>) => setIssues.mock.calls.at(-1)?.[0]

const runCheck = async (result: { current: { check: () => Promise<void> } }) => {
  await act(async () => {
    await result.current.check()
  })
}

describe('useContractCheck', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    contractOutcomeStore.outcome = null
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  it('stops without a request when the open panel is invalid', async () => {
    const form = makeForm({ getSubmitValues: vi.fn().mockResolvedValue(null) })
    const { result } = setup(form)

    await runCheck(result)

    expect(validate).not.toHaveBeenCalled()
    expect(result.current.isChecking).toBe(false)
  })

  it('clears resolved flags before it shows the findings', async () => {
    validate.mockResolvedValue(
      okResponse({ warnings: [contractWarning('WARNING', 'a')], coverage: COVERAGE })
    )
    const { result, form, setIssues } = setup()

    await runCheck(result)

    const clearOrder = form.clearAllResolvedFields.mock.invocationCallOrder[0]
    expect(clearOrder).toBeLessThan(setIssues.mock.invocationCallOrder[0])
  })

  it('validates with the workflow id on the edit page', async () => {
    validate.mockResolvedValue(okResponse({ warnings: [], coverage: COVERAGE }))
    const { result } = setup()

    await runCheck(result)

    expect(validate).toHaveBeenCalledWith(
      expect.objectContaining({ id: 'wf-1', body: BODY, signal: expect.any(AbortSignal) })
    )
  })

  it('validates without an id on the new page', async () => {
    validate.mockResolvedValue(okResponse({ warnings: [], coverage: COVERAGE }))
    const { result } = setup(makeForm(), null)

    await runCheck(result)

    expect(validate.mock.calls[0][0].id).toBeUndefined()
  })

  it('is checking while the request is in flight', async () => {
    let resolve: (value: unknown) => void = () => {}
    validate.mockReturnValue(
      new Promise((r) => {
        resolve = r
      })
    )
    const { result } = setup()

    let pending: Promise<void>
    await act(async () => {
      pending = result.current.check()
    })
    expect(result.current.isChecking).toBe(true)

    await act(async () => {
      resolve(okResponse({ warnings: [], coverage: COVERAGE }))
      await pending
    })
    expect(result.current.isChecking).toBe(false)
  })

  it('stores findings as not saved yet and opens the panel', async () => {
    validate.mockResolvedValue(
      okResponse({
        warnings: [contractWarning('WARNING', 'a'), contractWarning('UNVERIFIED', 'b')],
        coverage: COVERAGE,
      })
    )
    const { result, form, setIssues } = setup()

    await runCheck(result)

    expect(contractOutcomeStore.outcome).toMatchObject({
      key: 'wf-1',
      context: 'not-saved',
      coverage: COVERAGE,
    })
    expect(contractOutcomeStore.outcome).not.toHaveProperty('issues')
    expect(shownIssues(setIssues)).toHaveLength(2)
    expect(setIssues).toHaveBeenCalledWith(
      expect.arrayContaining([expect.objectContaining({ id: 'a' })])
    )
    expect(form.openIssuesPanel).toHaveBeenCalled()
    expect(toaster.success).not.toHaveBeenCalled()
  })

  describe('result context', () => {
    const findings = () => okResponse({ warnings: [contractWarning('WARNING', 'a')] })

    it('records no "not saved yet" note when the edit page has no unsaved edits', async () => {
      validate.mockResolvedValue(findings())
      const { result, form } = setup(
        makeForm({ hasUnsavedChanges: vi.fn().mockReturnValue(false) })
      )

      await runCheck(result)

      expect(contractOutcomeStore.outcome?.key).toBe('wf-1')
      expect(contractOutcomeStore.outcome?.context).toBeUndefined()
      expect(form.openIssuesPanel).toHaveBeenCalled()
    })

    it.each(['saved', 'created'] as const)(
      'keeps a previous "%s" note for the same workflow when nothing is unsaved',
      async (context) => {
        contractOutcomeStore.outcome = { key: 'wf-1', context }
        validate.mockResolvedValue(findings())
        const { result } = setup(makeForm({ hasUnsavedChanges: vi.fn().mockReturnValue(false) }))

        await runCheck(result)

        expect(contractOutcomeStore.outcome?.context).toBe(context)
      }
    )

    it('does not keep a "saved" note that belongs to another workflow', async () => {
      contractOutcomeStore.outcome = { key: 'other', context: 'saved' }
      validate.mockResolvedValue(findings())
      const { result } = setup(makeForm({ hasUnsavedChanges: vi.fn().mockReturnValue(false) }))

      await runCheck(result)

      expect(contractOutcomeStore.outcome).toMatchObject({ key: 'wf-1' })
      expect(contractOutcomeStore.outcome?.context).toBeUndefined()
    })

    it('does not keep a previous "rejected" note when nothing is unsaved', async () => {
      contractOutcomeStore.outcome = { key: 'wf-1', context: 'rejected' }
      validate.mockResolvedValue(findings())
      const { result } = setup(makeForm({ hasUnsavedChanges: vi.fn().mockReturnValue(false) }))

      await runCheck(result)

      expect(contractOutcomeStore.outcome?.context).toBeUndefined()
    })

    it('records "not saved yet" when the edit page holds edits', async () => {
      contractOutcomeStore.outcome = { key: 'wf-1', context: 'saved' }
      validate.mockResolvedValue(findings())
      const { result } = setup()

      await runCheck(result)

      expect(contractOutcomeStore.outcome?.context).toBe('not-saved')
    })

    it('always records "not saved yet" on the new page', async () => {
      validate.mockResolvedValue(findings())
      const { result } = setup(
        makeForm({ hasUnsavedChanges: vi.fn().mockReturnValue(false) }),
        null
      )

      await runCheck(result)

      expect(contractOutcomeStore.outcome).toMatchObject({ key: 'new', context: 'not-saved' })
    })
  })

  it('keys the outcome by "new" on the new page', async () => {
    validate.mockResolvedValue(okResponse({ warnings: [contractWarning('ERROR', 'a')] }))
    const { result } = setup(makeForm(), null)

    await runCheck(result)

    expect(contractOutcomeStore.outcome?.key).toBe('new')
  })

  it('toasts the validated state count and closes the panel when nothing is found', async () => {
    validate.mockResolvedValue(okResponse({ warnings: [], coverage: COVERAGE }))
    const { result, form } = setup()

    await runCheck(result)

    expect(toaster.success).toHaveBeenCalledWith(
      'No issues found<br>Input contract coverage: 3 of 3 states'
    )
    expect(form.closeIssuesPanel).toHaveBeenCalled()
    expect(form.openIssuesPanel).not.toHaveBeenCalled()
    expect(contractOutcomeStore.outcome).toBeNull()
  })

  it('reports validated of total, not the total, when only some states were validated', async () => {
    validate.mockResolvedValue(
      okResponse({
        warnings: [],
        coverage: { ...COVERAGE, validated_states: 2, uncovered_state_ids: ['c'] },
      })
    )
    const { result } = setup()

    await runCheck(result)

    expect(toaster.success).toHaveBeenCalledWith(
      'No issues found<br>Input contract coverage: 2 of 3 states'
    )
  })

  it('reports a failure and keeps the previous findings when the body is not JSON', async () => {
    contractOutcomeStore.outcome = {
      key: 'wf-1',
      context: 'not-saved',
    }
    validate.mockResolvedValue({ json: () => Promise.reject(new SyntaxError('bad json')) })
    const { result, form, setIssues } = setup()

    await runCheck(result)

    expect(toaster.error).toHaveBeenCalled()
    expect(toaster.success).not.toHaveBeenCalled()
    expect(setIssues).not.toHaveBeenCalled()
    expect(form.closeIssuesPanel).not.toHaveBeenCalled()
    expect(contractOutcomeStore.outcome).not.toBeNull()
  })

  it('says contracts were not analysed when there is no coverage', async () => {
    validate.mockResolvedValue(okResponse({ warnings: [] }))
    const { result, form } = setup()

    await runCheck(result)

    expect(toaster.success).toHaveBeenCalledWith('No issues found<br>Contracts were not analysed')
    expect(form.closeIssuesPanel).toHaveBeenCalled()
  })

  it('says contracts were not analysed when the coverage says so', async () => {
    validate.mockResolvedValue(
      okResponse({ warnings: [], coverage: { ...COVERAGE, analysed: false } })
    )
    const { result } = setup()

    await runCheck(result)

    expect(toaster.success).toHaveBeenCalledWith('No issues found<br>Contracts were not analysed')
  })

  it('treats warnings cut off at the limit as findings, not a clean result', async () => {
    validate.mockResolvedValue(
      okResponse({ warnings: [], warnings_truncated: 2, coverage: COVERAGE })
    )
    const { result, form } = setup()

    await runCheck(result)

    expect(toaster.success).not.toHaveBeenCalled()
    expect(toaster.info).toHaveBeenCalledWith('Check found warnings that could not be listed')
    expect(form.openIssuesPanel).toHaveBeenCalled()
    expect(form.closeIssuesPanel).not.toHaveBeenCalled()
    expect(contractOutcomeStore.outcome).toMatchObject({ key: 'wf-1', truncated: 2 })
  })

  it('toasts and opens the panel when everything is unverified', async () => {
    validate.mockResolvedValue(
      okResponse({
        warnings: [contractWarning('UNVERIFIED', 'a'), contractWarning('UNVERIFIED', 'b')],
        coverage: COVERAGE,
      })
    )
    const { result, form, setIssues } = setup()

    await runCheck(result)

    expect(toaster.info).toHaveBeenCalledWith('2 states could not be verified')
    expect(form.openIssuesPanel).toHaveBeenCalled()
    expect(shownIssues(setIssues)).toHaveLength(2)
  })

  it('sends non-contract warnings to notifyAboutWarnings and does not count them as findings', async () => {
    const consumerSlot = { kind: 'consumer_slot', tool_name: 'Jira', credential_type: 'Jira' }
    validate.mockResolvedValue(okResponse({ warnings: [consumerSlot] }))
    const { result, form } = setup()

    await runCheck(result)

    expect(notifyAboutWarnings).toHaveBeenCalledWith({ warnings: [consumerSlot] })
    expect(toaster.success).toHaveBeenCalledWith('No issues found<br>Contracts were not analysed')
    expect(form.openIssuesPanel).not.toHaveBeenCalled()
  })

  it('drops the response when a newer request superseded it', async () => {
    validate.mockImplementation(async () => {
      nextRequestToken()
      return okResponse({ warnings: [contractWarning('ERROR', 'a')] })
    })
    const { result, form } = setup()

    await runCheck(result)

    expect(contractOutcomeStore.outcome).toBeNull()
    expect(form.openIssuesPanel).not.toHaveBeenCalled()
    expect(toaster.success).not.toHaveBeenCalled()
  })

  it('still shows the response when only the version history changed meanwhile', async () => {
    const form = makeForm()
    validate.mockImplementation(async () => {
      // A save elsewhere refreshed the history; Check does not validate it.
      form.getFormValues.mockReturnValue({ ...BODY, yaml_config_history: [{ id: 'h1' }] })
      return okResponse({ warnings: [contractWarning('ERROR', 'a')] })
    })
    const { result, setIssues } = setup(form)

    await runCheck(result)

    expect(shownIssues(setIssues)).toHaveLength(1)
    expect(form.openIssuesPanel).toHaveBeenCalled()
  })

  it('drops the response when the config changed meanwhile', async () => {
    const form = makeForm()
    validate.mockImplementation(async () => {
      form.getFormValues.mockReturnValue({ ...BODY, yaml_config: 'states: [x]' })
      return okResponse({ warnings: [contractWarning('ERROR', 'a')] })
    })
    const { result } = setup(form)

    await runCheck(result)

    expect(contractOutcomeStore.outcome).toBeNull()
    expect(form.openIssuesPanel).not.toHaveBeenCalled()
    expect(result.current.isChecking).toBe(false)
  })

  it('shows an error toast when the request times out after 30 seconds', async () => {
    vi.useFakeTimers()
    validate.mockImplementation(
      ({ signal }) =>
        new Promise((_, reject) => {
          signal.addEventListener('abort', () => reject(new DOMException('aborted', 'AbortError')))
        })
    )
    const { result } = setup()

    await act(async () => {
      result.current.check()
      await vi.advanceTimersByTimeAsync(30_000)
    })

    expect(toaster.error).toHaveBeenCalledWith(expect.stringMatching(/timed out/i))
    expect(result.current.isChecking).toBe(false)
  })

  it('reports a stalled response body as a timeout, not as an unreadable response', async () => {
    vi.useFakeTimers()
    validate.mockImplementation(({ signal }) =>
      Promise.resolve({
        json: () =>
          new Promise((_, reject) => {
            signal.addEventListener('abort', () =>
              reject(new DOMException('aborted', 'AbortError'))
            )
          }),
      })
    )
    const { result } = setup()

    await act(async () => {
      result.current.check()
      await vi.advanceTimersByTimeAsync(30_000)
    })

    expect(toaster.error).toHaveBeenCalledTimes(1)
    expect(toaster.error).toHaveBeenCalledWith(expect.stringMatching(/timed out/i))
  })

  it('keeps error details sent as text in the Check toast', async () => {
    validate.mockRejectedValue(
      rejection(400, { message: 'Workflow Configuration error', details: 'Guardrail not found' })
    )
    const { result } = setup()

    await runCheck(result)

    expect(toaster.error).toHaveBeenCalledWith('Workflow Configuration error: Guardrail not found')
  })

  it('escapes backend text in the Check toast so names stay literal', async () => {
    validate.mockRejectedValue(
      rejection(400, { message: 'Bad name', details: '<b>name</b> & <img src=x onerror=alert(1)>' })
    )
    const { result } = setup()

    await runCheck(result)

    expect(toaster.error).toHaveBeenCalledWith(
      'Bad name: &lt;b&gt;name&lt;/b&gt; &amp; &lt;img src=x onerror=alert(1)&gt;'
    )
  })

  it('shows the safe 503 message, keeps the previous findings and reports no clean result', async () => {
    const previous = { key: 'wf-1', context: 'not-saved' as const }
    contractOutcomeStore.outcome = previous
    const parsed = { message: 'Service unavailable', details: 'Please try again later' }
    validate.mockRejectedValue(rejection(503, parsed))
    const { result, form, setIssues } = setup()

    await runCheck(result)

    expect(API.handleError).toHaveBeenCalledWith({ error: parsed }, true, true)
    expect(toaster.success).not.toHaveBeenCalled()
    expect(setIssues).not.toHaveBeenCalled()
    expect(form.closeIssuesPanel).not.toHaveBeenCalled()
    expect(contractOutcomeStore.outcome).toEqual(previous)
    expect(result.current.isChecking).toBe(false)
  })

  it('aborts the previous request silently when a new check starts', async () => {
    const signals: AbortSignal[] = []
    validate.mockImplementation(({ signal }) => {
      signals.push(signal)
      if (signals.length === 1) {
        return new Promise((_, reject) => {
          signal.addEventListener('abort', () => reject(new DOMException('aborted', 'AbortError')))
        })
      }
      return Promise.resolve(okResponse({ warnings: [], coverage: COVERAGE }))
    })
    const { result } = setup()

    await act(async () => {
      result.current.check()
    })
    await runCheck(result)

    expect(signals[0].aborted).toBe(true)
    expect(toaster.error).not.toHaveBeenCalled()
    expect(API.handleError).not.toHaveBeenCalled()
    expect(toaster.success).toHaveBeenCalledTimes(1)
  })

  it('aborts silently on unmount', async () => {
    let signal: AbortSignal | undefined
    validate.mockImplementation(
      (args) =>
        new Promise((_, reject) => {
          signal = args.signal
          signal!.addEventListener('abort', () => reject(new DOMException('aborted', 'AbortError')))
        })
    )
    const { result, unmount } = setup()

    await act(async () => {
      result.current.check()
    })
    await act(async () => {
      unmount()
    })

    expect(signal?.aborted).toBe(true)
    expect(toaster.error).not.toHaveBeenCalled()
    expect(API.handleError).not.toHaveBeenCalled()
  })

  it('shows API.handleError for a network error', async () => {
    validate.mockRejectedValue(new TypeError('Failed to fetch'))
    const { result } = setup()

    await runCheck(result)

    expect(API.handleError).toHaveBeenCalledWith(
      { error: expect.objectContaining({ message: expect.stringContaining('Failed to fetch') }) },
      true,
      true
    )
  })

  it('shows API.handleError for a 5xx', async () => {
    const parsed = { message: 'Internal error' }
    validate.mockRejectedValue(rejection(500, parsed))
    const { result } = setup()

    await runCheck(result)

    expect(API.handleError).toHaveBeenCalledWith({ error: parsed }, true, true)
  })

  it('routes a whitelisted non-contract 400 to the panel as not saved yet', async () => {
    validate.mockRejectedValue(
      rejection(400, {
        message: 'Workflow Configuration error',
        details: {
          error_type: 'schema_validation',
          message: 'bad',
          errors: [
            { id: 'e1', message: 'Bad field', path: 'name', state_id: 's1', config_line: 2 },
          ],
        },
      })
    )
    const { result, form, setIssues } = setup()

    await runCheck(result)

    expect(contractOutcomeStore.outcome).toMatchObject({ key: 'wf-1', context: 'not-saved' })
    expect(shownIssues(setIssues)[0]).toMatchObject({ id: 'e1', stateId: 's1' })
    expect(form.openIssuesPanel).toHaveBeenCalled()
    expect(toaster.error).not.toHaveBeenCalled()
  })

  it('routes a contract rejection to the panel with every outcome', async () => {
    validate.mockRejectedValue(
      rejection(400, {
        message: 'Workflow Configuration error',
        details: {
          error_type: 'contract_validation',
          message: 'Workflow contracts are not satisfied',
          errors: [{ id: 'e1', outcome: 'ERROR', state_id: 's1', path: 'x', message: 'Missing x' }],
          warnings: [contractWarning('UNVERIFIED', 'u1')],
          coverage: COVERAGE,
        },
      })
    )
    const { result, form, setIssues } = setup()

    await runCheck(result)

    expect(shownIssues(setIssues)).toHaveLength(2)
    expect(contractOutcomeStore.outcome?.coverage).toEqual(COVERAGE)
    expect(form.openIssuesPanel).toHaveBeenCalled()
  })

  it.each([
    [400, { message: 'Some other problem' }],
    [403, { message: 'Forbidden' }],
    [404, { message: 'Not found' }],
    [410, { message: 'Gone' }],
  ])('toasts the backend message for a %i that has no issues', async (status, parsed) => {
    validate.mockRejectedValue(rejection(status, parsed))
    const { result, form } = setup()

    await runCheck(result)

    expect(toaster.error).toHaveBeenCalledWith(expect.stringContaining(parsed.message))
    expect(form.openIssuesPanel).not.toHaveBeenCalled()
    expect(API.handleError).not.toHaveBeenCalled()
  })
})
