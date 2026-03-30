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

import { WorkflowFieldPath } from '@/types/entity'

type FieldPattern = WorkflowFieldPath | RegExp

interface FieldRegistration {
  nodeTypes?: Set<string>
  errorTypes?: Set<string>
}

interface FieldRegistryState {
  exactPaths: Map<string, FieldRegistration>
  patterns: Array<{ pattern: RegExp; registration: FieldRegistration }>
}

const registryState: FieldRegistryState = {
  exactPaths: new Map(),
  patterns: [],
}

/** Normalize string or array to Set */
function normalizeToSet(input?: string | string[]): Set<string> | undefined {
  return input ? new Set(Array.isArray(input) ? input : [input]) : undefined
}

/** Merge types into existing registration */
function mergeTypes(
  existing: FieldRegistration,
  newTypes: Set<string> | undefined,
  key: keyof FieldRegistration
): void {
  if (!newTypes) return
  if (!existing[key]) {
    existing[key] = new Set()
  }
  newTypes.forEach((type) => (existing[key] as Set<string>).add(type))
}

/** Register exact path */
function registerExactPath(path: string, registration: FieldRegistration): void {
  const existing = registryState.exactPaths.get(path)
  if (existing) {
    mergeTypes(existing, registration.nodeTypes, 'nodeTypes')
    mergeTypes(existing, registration.errorTypes, 'errorTypes')
  } else {
    registryState.exactPaths.set(path, registration)
  }
}

/** Register pattern */
function registerPattern(pattern: RegExp, registration: FieldRegistration): void {
  registryState.patterns.push({ pattern, registration })
}

/** Register a single field path or pattern with optional node types and error types */
export function registerField(
  pathOrPattern: FieldPattern,
  nodeTypes?: string | string[],
  errorTypes?: string | string[]
): void {
  const registration: FieldRegistration = {
    nodeTypes: normalizeToSet(nodeTypes),
    errorTypes: normalizeToSet(errorTypes),
  }

  if (typeof pathOrPattern === 'string') {
    registerExactPath(pathOrPattern, registration)
  } else {
    registerPattern(pathOrPattern, registration)
  }
}

/** Register multiple field paths and/or patterns with optional node types and error types */
export function registerFields(
  pathsOrPatterns: FieldPattern[],
  nodeTypes?: string | string[],
  errorTypes?: string | string[]
): void {
  pathsOrPatterns.forEach((p) => registerField(p, nodeTypes, errorTypes))
}

/** Check if a field matches the given node type constraints */
function matchesNodeType(registeredTypes: Set<string> | undefined, nodeType?: string): boolean {
  if (!registeredTypes) return true
  if (!nodeType) return true
  return registeredTypes.has(nodeType)
}

/** Check if a field matches the given error type constraints */
function matchesErrorType(registeredTypes: Set<string> | undefined, errorType?: string): boolean {
  if (!registeredTypes) return true
  if (!errorType) return true
  return registeredTypes.has(errorType)
}

/** Check if a field path is supported in the visual editor for a specific node type and error type */
export function isFieldSupported(path: string, nodeType?: string, errorType?: string): boolean {
  const exactMatch = registryState.exactPaths.get(path)
  if (exactMatch !== undefined) {
    return (
      matchesNodeType(exactMatch.nodeTypes, nodeType) &&
      matchesErrorType(exactMatch.errorTypes, errorType)
    )
  }

  for (const { pattern, registration } of registryState.patterns) {
    if (
      pattern.test(path) &&
      matchesNodeType(registration.nodeTypes, nodeType) &&
      matchesErrorType(registration.errorTypes, errorType)
    ) {
      return true
    }
  }

  return false
}

const ADVANCED_CONFIG_FIELDS = [
  'enable_summarization_node',
  'tokens_limit_before_summarization',
  'messages_limit_before_summarization',
  'max_concurrency',
  'recursion_limit',
  'retry_policy.max_attempts',
  'retry_policy.initial_interval',
  'retry_policy.max_interval',
  'retry_policy.backoff_factor',
] as const

/** Check if a field path is a top-level advanced config field */
export function isAdvancedConfigField(path: string): boolean {
  return ADVANCED_CONFIG_FIELDS.some((field) => path === field || path.startsWith(`${field}.`))
}
