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
 * Evaluating a component's `checks` — the one place that decides whether a field is
 * satisfied, and therefore the one place that knows what to tell the user about it.
 *
 * Two callers need the same answer and must never disagree: the surface decides whether
 * the submit button is usable, and the field prints the message explaining why it is not.
 * They lived apart once, and the result was a form that refused to submit and said
 * nothing — the SDK injects `validationErrors` into the props of the component that owns
 * the checks, but only its own TextField and CheckBox render them, and a wrapper placed
 * around a catalog component is handed the context, never those resolved props.
 *
 * Imports nothing but the version boundary, so both the hook and the component factory
 * can depend on it without a cycle.
 */

import type { DataContext } from './config'

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null && !Array.isArray(value)

/**
 * True when a check condition only reads absolute data-model paths, so it can be
 * evaluated against the surface root. Conditions scoped to a list item use relative
 * paths, which resolve to nothing at the root and would otherwise report a permanently
 * invalid surface.
 */
const usesOnlyAbsolutePaths = (value: unknown): boolean => {
  if (Array.isArray(value)) return value.every(usesOnlyAbsolutePaths)
  if (!isRecord(value)) return true
  return Object.entries(value).every(([key, nested]) => {
    if (key === 'path' && typeof nested === 'string') return nested.startsWith('/')
    return usesOnlyAbsolutePaths(nested)
  })
}

/**
 * The first `checks` rule a component fails, or undefined when it is satisfied.
 *
 * A rule is `{condition, message}`; the condition alone is accepted too, since the
 * catalog allows it and agents write it. An unevaluatable rule counts as passing — it
 * must not lock the user out of their own form.
 */
export function firstFailingCheck(
  context: DataContext,
  properties: Record<string, unknown> | undefined
): { message?: unknown } | undefined {
  const checks = properties?.checks
  const rules = Array.isArray(checks) ? checks : []
  const failed = rules.find((rule) => {
    const condition = isRecord(rule) && 'condition' in rule ? rule.condition : rule
    if (condition === undefined || !usesOnlyAbsolutePaths(condition)) return false
    try {
      return !context.resolveDynamicValue(condition as never)
    } catch {
      // An unevaluatable rule counts as passing — it must not lock the user out.
      return false
    }
  })
  // One return that always carries a value — `return undefined` beside a returned object is
  // what `consistent-return` refuses — and no nested ternary, which is a rule of its own.
  const rule = isRecord(failed) ? failed : {}
  return failed === undefined ? undefined : rule
}

/** The message to show for a component's failed check, when it carries a usable one. */
export function failingCheckMessage(
  context: DataContext,
  properties: Record<string, unknown> | undefined
): string | undefined {
  const message = firstFailingCheck(context, properties)?.message
  return typeof message === 'string' && message.length > 0 ? message : undefined
}

/** Whether every `checks` rule this component declares is currently satisfied. */
export function componentChecksPass(
  context: DataContext,
  component: { properties?: Record<string, unknown> }
): boolean {
  return !firstFailingCheck(context, component.properties)
}

/**
 * The conditions this component's checks evaluate, in declaration order.
 *
 * Exposed so a caller can subscribe to them: a check's answer changes when the data model
 * does, and whatever renders its message has to be told, or the message it printed once
 * stays on screen after the user has fixed the field.
 */
export function checkConditions(properties: Record<string, unknown> | undefined): unknown[] {
  const checks = properties?.checks
  if (!Array.isArray(checks)) return []
  return checks
    .map((rule) => (isRecord(rule) && 'condition' in rule ? rule.condition : rule))
    .filter((condition) => condition !== undefined)
}
