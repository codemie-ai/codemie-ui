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
import { proxy } from 'valtio'

import { WorkflowIssue } from '@/types/entity'
import {
  ContractCoverage,
  ParsedContractOutcome,
} from '@/utils/workflowEditor/helpers/contractProtocol'

/** Where the outcome came from; drives the note the issues panel shows. */
export type OutcomeContext = 'saved' | 'created' | 'not-saved' | 'rejected'

/**
 * What the issues panel shows around the issues. The issues themselves live on the page that owns
 * the form; only the create-to-edit handover below carries them across a navigation.
 */
export interface ContractOutcome {
  /** Workflow id (or a stand-in for an unsaved workflow) the outcome belongs to. */
  key: string
  coverage?: ContractCoverage
  truncated?: number
  /** No context, no note: a Check of a workflow that has no unsaved edits. */
  context?: OutcomeContext
}

interface ContractOutcomeStoreType {
  outcome: ContractOutcome | null
}

/** In-memory only: a reload shows a clean edit page. */
export const contractOutcomeStore = proxy<ContractOutcomeStoreType>({ outcome: null })

export const applyOutcome = (
  parsed: Pick<ParsedContractOutcome, 'coverage' | 'truncated'>,
  context: OutcomeContext | undefined,
  key: string
) => {
  contractOutcomeStore.outcome = {
    key,
    coverage: parsed.coverage,
    truncated: parsed.truncated,
    context,
  }
}

/** Clears the slot only when it still belongs to `key`. */
export const clearOutcome = (key: string) => {
  if (contractOutcomeStore.outcome?.key === key) contractOutcomeStore.outcome = null
}

/** Clears the slot whoever it belongs to. */
export const resetOutcome = () => {
  contractOutcomeStore.outcome = null
}

let handedOverIssues: { key: string; issues: WorkflowIssue[] } | null = null

/** A create that came back with warnings leaves its issues for the edit page it navigates to. */
export const handOverIssues = (key: string, issues: WorkflowIssue[]) => {
  handedOverIssues = { key, issues }
}

/** Takes the issues handed over for `key` (once); anything handed over for another key is dropped. */
export const takeHandedOverIssues = (key: string): WorkflowIssue[] | null => {
  const handedOver = handedOverIssues
  handedOverIssues = null
  return handedOver?.key === key ? handedOver.issues : null
}

let requestToken = 0

/**
 * A later request supersedes an earlier one. Check, restore and save each take a token; a save's
 * own response is always shown, but starting it invalidates every Check or restore still in flight.
 */
export const nextRequestToken = (): number => {
  requestToken += 1
  return requestToken
}

export const isTokenCurrent = (token: number): boolean => token === requestToken
