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

import { fireEvent, screen } from '@testing-library/react'

import { FEATURE_FLAGS } from '@/constants/featureFlags'
import { appInfoStore } from '@/store/appInfo'
import { selectDropdownOption } from '@/test-utils/component-interactions'

import type { UserEvent } from '@testing-library/user-event'

export const INPUT_CONTRACT_PLACEHOLDER = 'Expected input format (JSON Schema)'
export const OUTPUT_CONTRACT_PLACEHOLDER = 'Expected output format (JSON Schema)'
export const DEFAULT_MODE_LABEL = 'Use workflow default'

export const INPUT_SCHEMA = '{"type":"object","properties":{"a":{"type":"string"}}}'
export const OUTPUT_SCHEMA = '{"type":"object","properties":{"b":{"type":"number"}}}'

/**
 * Turns the workflow contracts flag on, as the platform config would. `setupTests.tsx` resets
 * `appInfoStore.configs` after every test, so call it in `beforeEach`.
 */
export const enableWorkflowContracts = () => {
  appInfoStore.configs = [{ id: FEATURE_FLAGS.WORKFLOW_CONTRACTS, settings: { enabled: true } }]
  appInfoStore.isConfigFetched = true
}

export interface ContractInput {
  input?: string
  output?: string
  mode?: string
}

/** The visible dropdown label (PrimeReact also renders a hidden native select with the same text). */
export const modeLabel = (): HTMLElement => {
  const label = document.querySelector<HTMLElement>('.p-dropdown-label')
  if (!label) throw new Error('Save validation dropdown is not rendered')
  return label
}

/** Types into the contract fields and picks a save validation through the dropdown. */
export const fillContract = async (user: UserEvent, { input, output, mode }: ContractInput) => {
  if (input !== undefined) {
    fireEvent.change(screen.getByPlaceholderText(INPUT_CONTRACT_PLACEHOLDER), {
      target: { value: input },
    })
  }
  if (output !== undefined) {
    fireEvent.change(screen.getByPlaceholderText(OUTPUT_CONTRACT_PLACEHOLDER), {
      target: { value: output },
    })
  }
  if (mode !== undefined) {
    await selectDropdownOption('Save validation', mode, { user })
  }
}
