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

import * as Yup from 'yup'

import { VALIDATION_MODES } from '@/utils/workflowEditor/helpers/contractProtocol'

/** Save validation options; the empty value is the default named by `defaultLabel`. */
export const buildModeOptions = (defaultLabel: string) => [
  { label: defaultLabel, value: '' },
  ...VALIDATION_MODES.map((mode) => ({ label: mode, value: mode })),
]

/** What each mode does on save; the backend contract policy decides it. */
const MODE_LINES = `- warn: a broken requirement declared in an input contract blocks the save; other findings are reported as warnings.
- strict: every contract finding blocks the save.`

export const NODE_MODE_HINT = `How contract findings on this node are treated.

- Use workflow default: follow the workflow-level save validation (warn when that is unset).
${MODE_LINES}`

export const WORKFLOW_MODE_HINT = `Workflow-level save validation, used by nodes set to "Use workflow default".

- Default (warn): same as warn.
${MODE_LINES}`

export const REQUIRE_INPUT_CONTRACTS_HINT =
  'Every action node needs an input contract, declared or derived from its configuration. A node with neither blocks the save, in warn and strict mode.'

export const NODE_MODE_SELECT_ID = 'node_validation_mode_select'
export const WORKFLOW_MODE_SELECT_ID = 'workflow_validation_mode_select'

/**
 * `.when()` option for contract fields. With the contracts flag off (`$contractsEnabled` in the form
 * context) their controls are hidden, so the form cannot show an error on a value the YAML sets: the
 * field is not checked, the save goes through, and the backend's schema error opens in YAML.
 */
export const SKIP_WHEN_CONTRACTS_OFF = {
  is: false,
  then: () => Yup.mixed().optional(),
} as const
