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

import { MARKETPLACE_MANAGEMENT_PATH } from '@/constants/routes'
import type { GateRule } from '@/types/generated/marketplaceManagement'
import { ColumnDefinition, DefinitionTypes } from '@/types/table'
import { formatLabelSentenceCase } from '@/utils/formatLabel'

export const CLEANUP_BASE = `${MARKETPLACE_MANAGEMENT_PATH}/cleanup`

// ── Backend value → human label ─────────────────────────────────────────────
// The audit engine emits snake_case check ids and SCREAMING_CASE reason codes.
// Rendering those straight into a table shows the admin an internal
// identifier they cannot act on, so every code is translated here. Unmapped
// values fall back to a humanised form rather than disappearing.

/**
 * Quality-check id -> admin-facing label. The keys are the eight `rule=`
 * literals the audit engine's gate registry emits (`validator/gates.py`);
 * a key that is not in that registry is a label no admin can ever see.
 *
 * Typed as `Record<GateRule, string>` so the map is exhaustive against the
 * generated enum in both directions: a rule the backend adds fails to compile
 * until it has a label, and an invented one fails to compile at all. Since
 * EXECUTION-PLAN 4.2 an unknown `rule=` is a 422, so an invented key here
 * would produce a drill-down link that errors rather than one that matches
 * nothing.
 */
export const CHECK_LABEL: Record<GateRule, string> = {
  name_length: 'Name is too short or too long',
  name_not_banned: 'Name is too generic',
  description_length: 'Description too short',
  description_not_equal_name: 'Description just repeats the name',
  system_prompt_length: 'Instructions too short',
  at_least_one_category: 'No category assigned',
  substance: 'No tools, skills or real instructions',
  no_inline_credentials: 'Possible credential in the instructions',
  credential_scan_timeout: 'Credential scan timed out',
}

// The API is the source of `rule`; anything outside the enum still renders,
// humanised, rather than throwing.
export const checkLabel = (rule: string): string =>
  CHECK_LABEL[rule as GateRule] ?? formatLabelSentenceCase(rule)

// ── Column definitions ──────────────────────────────────────────────────────

export const REASON_COLUMNS: ColumnDefinition[] = [
  { key: 'reason', label: 'Reason', type: DefinitionTypes.Custom },
  { key: 'count', label: 'Assistants', type: DefinitionTypes.Custom, headClassNames: 'w-[15%]' },
  { key: 'action', label: '', type: DefinitionTypes.Custom, headClassNames: 'w-[20%]' },
]

export const GATE_COLUMNS: ColumnDefinition[] = [
  { key: 'rule', label: 'Check', type: DefinitionTypes.Custom },
  { key: 'severity', label: 'Importance', type: DefinitionTypes.Custom, headClassNames: 'w-[25%]' },
  { key: 'count', label: 'Assistants', type: DefinitionTypes.Custom, headClassNames: 'w-[15%]' },
  // The action renderer below builds ?bucket=ALL&rule=<rule>, but without a
  // column to render into it never appeared — the table showed a count with no
  // way to reach the assistants behind it. Every sibling table declares one.
  { key: 'action', label: '', type: DefinitionTypes.Custom, headClassNames: 'w-[18%]' },
]

// Every numeric column says what it counts. "Count" and "Users" repeated
// across tables told the admin nothing about what the number referred to,
// and "MCP" is an internal noun.
export const MCP_COLUMNS: ColumnDefinition[] = [
  {
    key: 'value',
    label: 'MCP server',
    type: DefinitionTypes.String,
    headerNoWrap: false,
    headClassNames: 'w-[20%]',
  },
  { key: 'count', label: 'Assistants', type: DefinitionTypes.Custom, headClassNames: 'w-[20%]' },
  {
    key: 'total_users',
    label: 'Total users',
    type: DefinitionTypes.Custom,
    headClassNames: 'w-[18%]',
  },
  { key: 'action', label: '', type: DefinitionTypes.Custom, headClassNames: 'w-[18%]' },
]

export const CATEGORY_COLUMNS: ColumnDefinition[] = [
  {
    key: 'value',
    label: 'Category',
    type: DefinitionTypes.String,
    headerNoWrap: false,
    headClassNames: 'w-[20%]',
  },
  { key: 'count', label: 'Assistants', type: DefinitionTypes.Custom, headClassNames: 'w-[20%]' },
  {
    key: 'total_users',
    label: 'Total users',
    type: DefinitionTypes.Custom,
    headClassNames: 'w-[18%]',
  },
  { key: 'action', label: '', type: DefinitionTypes.Custom, headClassNames: 'w-[18%]' },
]
