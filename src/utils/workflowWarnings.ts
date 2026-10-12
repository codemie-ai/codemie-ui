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

import toaster from '@/utils/toaster'

export interface ConsumerSlotWarning {
  kind: 'consumer_slot'
  tool_name: string
  credential_type: string
}

export interface ScriptStepOwnerIntegrationWarning {
  kind: 'script_step_owner_integration'
  step_id: string
  tool_name: string
  integration_alias: string
  message: string
}

export interface UnknownWarning {
  kind: string
  message?: string
}

export type WorkflowWarning =
  | ConsumerSlotWarning
  | ScriptStepOwnerIntegrationWarning
  | UnknownWarning

export interface FormattedWarning {
  message: string
  highlight: { stepId?: string; toolName?: string }
}

const MAX_LISTED_TOOLS = 3

const isObject = (value: unknown): value is Record<string, any> =>
  typeof value === 'object' && value !== null && !Array.isArray(value)

/** Entries without `kind` but shaped like a consumer slot are treated as consumer slots. */
export const normalizeWarnings = (raw?: unknown[]): WorkflowWarning[] => {
  if (!Array.isArray(raw)) return []

  return raw.filter(isObject).map((entry) => {
    if (!entry.kind && entry.tool_name && entry.credential_type) {
      return { ...entry, kind: 'consumer_slot' } as ConsumerSlotWarning
    }
    return entry as WorkflowWarning
  })
}

export const formatWarning = (warning: WorkflowWarning): FormattedWarning => {
  if (warning.kind === 'script_step_owner_integration') {
    const w = warning as ScriptStepOwnerIntegrationWarning
    return { message: w.message, highlight: { stepId: w.step_id, toolName: w.tool_name } }
  }

  if (warning.kind === 'consumer_slot') {
    const w = warning as ConsumerSlotWarning
    return {
      message: `${w.tool_name} (${w.credential_type})`,
      highlight: { toolName: w.tool_name },
    }
  }

  return { message: (warning as UnknownWarning).message ?? '', highlight: {} }
}

const OWNER_INTEGRATION_TOAST_MS = 8000

const notifyConsumerSlots = (warnings: WorkflowWarning[], prefixSaved?: boolean) => {
  const tools = warnings.map((w) => formatWarning(w).message).join('; ')
  const prefix = prefixSaved ? 'Saved. ' : ''
  toaster.info(`${prefix}These tools will use each user's own integration: ${tools}.`)
}

const notifyScriptOwnerIntegration = (warnings: WorkflowWarning[], prefixSaved?: boolean) => {
  const names = (warnings as ScriptStepOwnerIntegrationWarning[]).map((w) => w.tool_name)
  const listed = names.slice(0, MAX_LISTED_TOOLS).join('; ')
  const rest = names.length - MAX_LISTED_TOOLS
  const more = rest > 0 ? ` and ${rest} more` : ''
  const prefix = prefixSaved ? 'Saved. ' : ''
  toaster.info(
    `${prefix}Script steps run these tools under the workflow author's integration for everyone who runs the workflow: ${listed}${more}.`,
    { duration: OWNER_INTEGRATION_TOAST_MS }
  )
}

const notifyUnknown = (warnings: WorkflowWarning[]) => {
  const messages = warnings.map((w) => formatWarning(w).message).filter(Boolean)
  if (messages.length) toaster.info(messages.join('; '))
}

/**
 * Advisory only: saving is never blocked. One toast per warning kind. The full script-step
 * messages are shown in the publish modal; the toast keeps to a short list of tool names.
 */
export const notifyAboutWarnings = (
  body?: { warnings?: unknown[] },
  opts?: { prefixSaved?: boolean }
) => {
  const warnings = normalizeWarnings(body?.warnings)
  if (!warnings.length) return

  const consumer = warnings.filter((w) => w.kind === 'consumer_slot')
  const script = warnings.filter((w) => w.kind === 'script_step_owner_integration')
  const unknown = warnings.filter(
    (w) => w.kind !== 'consumer_slot' && w.kind !== 'script_step_owner_integration'
  )

  if (consumer.length) notifyConsumerSlots(consumer, opts?.prefixSaved)
  if (script.length) notifyScriptOwnerIntegration(script, opts?.prefixSaved)
  if (unknown.length) notifyUnknown(unknown)
}
