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

import { FC, PropsWithChildren } from 'react'

import AlertIcon from '@/assets/icons/alert.svg?react'

import type { CostState } from '../costCompleteness'

/** Selection-level warning: the costs below cover the priced models only. Nothing for a fully priced one. */
const CostIncompleteNotice: FC<PropsWithChildren<{ state: CostState }>> = ({ state, children }) => {
  if (!state.incomplete) return null
  return (
    <output
      data-testid="cost-incomplete-notice"
      className="flex items-center gap-2 text-xs text-text-quaternary"
    >
      <AlertIcon className="w-3 h-3 shrink-0" aria-hidden="true" />
      <span>
        Costs show the priced part only; a $0 may mean no price. No price for{' '}
        {state.unpricedModels.join(', ')}.{children}
      </span>
    </output>
  )
}

export default CostIncompleteNotice
