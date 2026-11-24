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

/**
 * Wire protocol for workflow contract validation (EPMCDME-16504 backend).
 * Holds the literals and the parser that turns a save/validate response body into editor issues.
 */

import { IssueOutcome, WorkflowIssue } from '@/types/entity'
import { NodeType, NodeTypes } from '@/types/workflowEditor/base'

export const CONTRACT_ERROR_TYPE = 'contract_validation'
export const CONTRACT_WARNING_KIND = 'contract_validation'
export const VALIDATION_MODES = ['warn', 'strict'] as const
export type ValidationMode = (typeof VALIDATION_MODES)[number]

export type { IssueOutcome }

/** Every issue outcome, most severe first. */
export const ISSUE_OUTCOMES: readonly IssueOutcome[] = ['ERROR', 'WARNING', 'UNVERIFIED']

export interface ContractCoverage {
  validated_states: number
  total_states: number
  uncovered_state_ids: string[]
  analysed: boolean
  cap_reached: boolean
}

export interface ParsedContractOutcome {
  issues: WorkflowIssue[]
  coverage?: ContractCoverage
  truncated?: number
  otherWarnings: unknown[]
}

type RawRecord = Record<string, any>

const isRecord = (value: unknown): value is RawRecord =>
  typeof value === 'object' && value !== null && !Array.isArray(value)

export const isContractWarning = (warning: unknown): boolean =>
  isRecord(warning) && warning.kind === CONTRACT_WARNING_KIND

const toOutcome = (value: unknown): IssueOutcome =>
  ISSUE_OUTCOMES.includes(value as IssueOutcome) ? (value as IssueOutcome) : 'ERROR'

const TRANSFORM_OUTPUT_SCHEMA_PATH = 'config.output_schema'

/**
 * `input_schema.properties.x` points inside JSON text, so it collapses to the `input_schema` field, and a
 * transform's `config.output_schema.properties.x` to its Output Schema control. Without `config_path` the
 * backend named no field (`path` may be a context key such as `task`), so the registry path stays empty
 * and Go to Issue opens YAML.
 */
const toRegistryPath = (configPath: unknown): string => {
  if (typeof configPath !== 'string' || !configPath) return ''
  if (configPath.startsWith('input_schema.')) return 'input_schema'
  if (configPath.startsWith(`${TRANSFORM_OUTPUT_SCHEMA_PATH}.`)) return TRANSFORM_OUTPUT_SCHEMA_PATH
  return configPath
}

const parseCoverage = (raw: unknown): ContractCoverage | null => {
  if (!isRecord(raw)) return null
  const count = (value: unknown) => (typeof value === 'number' && value >= 0 ? value : 0)
  return {
    validated_states: count(raw.validated_states),
    total_states: count(raw.total_states),
    uncovered_state_ids: Array.isArray(raw.uncovered_state_ids)
      ? raw.uncovered_state_ids.filter((id): id is string => typeof id === 'string')
      : [],
    analysed: raw.analysed === true,
    cap_reached: raw.cap_reached === true,
  }
}

const META_KEYS: Record<string, string> = {
  toolkit_type: 'toolkitType',
  toolkit_name: 'toolkitName',
  tool_name: 'toolName',
  mcp_name: 'mcpName',
}

const toMeta = (meta: RawRecord): RawRecord =>
  Object.fromEntries(Object.entries(meta).map(([key, value]) => [META_KEYS[key] ?? key, value]))

/**
 * Turns one backend issue (`WorkflowValidationErrorDetail`) into an editor issue. Contract issues name
 * their field through `config_path`; every other type sends the registry path as `path`.
 */
export const toWorkflowIssue = (
  raw: RawRecord,
  errorType: string,
  usedIds: Set<string>,
  index: number
): WorkflowIssue => {
  const { id, state_id, config_line, config_path, config_section, outcome, meta } = raw

  let uniqueId = typeof id === 'string' && id ? id : `${errorType}-${index}`
  while (usedIds.has(uniqueId)) uniqueId = `${uniqueId}-${index}`
  usedIds.add(uniqueId)

  const rawPath = typeof raw.path === 'string' ? raw.path : ''
  const path = errorType === CONTRACT_ERROR_TYPE ? toRegistryPath(config_path) : rawPath

  return {
    id: uniqueId,
    message: typeof raw.message === 'string' ? raw.message : '',
    ...(typeof raw.details === 'string' ? { details: raw.details } : {}),
    ...(state_id ? { stateId: state_id } : {}),
    path,
    configLine: typeof config_line === 'number' ? config_line : 0,
    error_type: errorType,
    outcome: toOutcome(outcome),
    ...(config_section ? { configSection: config_section } : {}),
    ...(config_path ? { configPath: config_path } : {}),
    ...(isRecord(meta) ? { meta: toMeta(meta) } : {}),
  } as WorkflowIssue
}

/**
 * Parses a 2xx save/validate body (`{ warnings, coverage, warnings_truncated }`) or a rejection's
 * `error.details` (`{ errors, warnings, coverage }`). The whole `{ error: { details } }` envelope is accepted too.
 */
export const parseContractOutcome = (body: unknown): ParsedContractOutcome => {
  const source = isRecord(body) && isRecord(body.error) ? body.error.details : body
  if (!isRecord(source)) return { issues: [], otherWarnings: [] }

  const errors = Array.isArray(source.errors) ? source.errors.filter(isRecord) : []
  const warnings = Array.isArray(source.warnings) ? source.warnings : []
  const contractWarnings = warnings.filter(isContractWarning) as RawRecord[]

  // A rejection names its type; contract warnings in a 2xx body are always contract issues.
  const errorType = typeof source.error_type === 'string' ? source.error_type : CONTRACT_ERROR_TYPE
  const usedIds = new Set<string>()
  const issues = [
    ...errors.map((raw, index) => toWorkflowIssue(raw, errorType, usedIds, index)),
    ...contractWarnings.map((raw, index) =>
      toWorkflowIssue(raw, CONTRACT_ERROR_TYPE, usedIds, errors.length + index)
    ),
  ]

  const coverage = parseCoverage(source.coverage)
  const truncated =
    typeof source.warnings_truncated === 'number' ? source.warnings_truncated : undefined

  return {
    issues,
    ...(coverage ? { coverage } : {}),
    ...(truncated !== undefined ? { truncated } : {}),
    otherWarnings: warnings.filter((warning) => !isContractWarning(warning)),
  }
}

/**
 * A finding in a 2xx save body the author has to see: a WARNING, or an ERROR (an unknown outcome is
 * read as ERROR, fail closed, so it must not pass as a clean save either).
 */
export const isSaveFinding = (issue: WorkflowIssue): boolean =>
  issue.outcome === 'WARNING' || issue.outcome === 'ERROR'

/**
 * A saved result the author has to look at: a visible finding, or entries the backend cut off at its
 * response limit. The cut-off ones have unknown severity, so they must not read as a clean save.
 */
export const hasSaveWarnings = (parsed: ParsedContractOutcome): boolean =>
  parsed.issues.some(isSaveFinding) || (parsed.truncated ?? 0) > 0

/** Text of the input contract coverage line, shared by the Issues panel and the Check toast. */
export const formatCoverage = (coverage: ContractCoverage): string =>
  `Input contract coverage: ${coverage.validated_states} of ${coverage.total_states} states`

/** State settings the transform tab does not render (CommonStateFields with `showAllFields={false}`). */
const TRANSFORM_HIDDEN_PATHS = new Set([
  'interrupt_before',
  'finish_iteration',
  'resolve_dynamic_values_in_prompt',
  'result_as_human_message',
])

/**
 * Issue paths, of any error type, that would open a missing or different control for this node type,
 * so navigation must fall back to YAML: `task` on a node without a Task control (`hasTaskField`, by
 * default only assistants have one), the state settings and retry policy the transform tab hides, and
 * state-level `output_schema` on transform (which would otherwise bind to the transform form's own
 * `config.output_schema`).
 */
export const isHiddenControlPath = (
  path: string,
  nodeType: NodeType,
  hasTaskField = nodeType === NodeTypes.ASSISTANT
): boolean => {
  if (path === 'task') return !hasTaskField
  if (nodeType !== NodeTypes.TRANSFORM) return false
  return (
    path === 'output_schema' || TRANSFORM_HIDDEN_PATHS.has(path) || path.startsWith('retry_policy.')
  )
}
