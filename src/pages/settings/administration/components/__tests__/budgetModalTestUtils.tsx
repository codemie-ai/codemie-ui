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

import type { PopupProps } from '@/components/Popup/Popup'

// Shared by the UnifiedProjectBudgetModal suites. Wire the Popup mock in with a lazy factory so
// vi.mock hoisting does not reach it before this module loads:
//   vi.mock('@/components/Popup', async () => ({
//     default: (await import('./budgetModalTestUtils')).MockPopup,
//   }))

export const activePlan = {
  group_id: 'g1',
  name: 'My Budget',
  description: 'desc',
  budget_duration: '30d',
  total_amount: 1000,
  categories: [
    { category: 'platform', max_budget: 300, soft_budget: 100 },
    { category: 'cli', max_budget: 600, soft_budget: 200 },
    { category: 'premium_models', max_budget: 100, soft_budget: 50 },
  ],
}

export const MockPopup = ({
  visible,
  children,
  onSubmit,
  onHide,
  submitText = 'Submit',
  headerContent,
  busy,
  busyHint,
}: PopupProps) => {
  if (!visible) return null
  return (
    <dialog open aria-busy={busy ? 'true' : undefined}>
      {headerContent}
      {children}
      {busy && <p data-testid="busy-hint">{busyHint}</p>}
      <button type="button" onClick={onHide} disabled={busy}>
        Cancel
      </button>
      <button type="button" onClick={onSubmit}>
        {submitText}
      </button>
    </dialog>
  )
}

/** A promise the test settles by hand, to hold a save in flight. */
export function deferred<T = unknown>() {
  let resolve!: (value: T) => void
  let reject!: (reason?: unknown) => void
  const promise = new Promise<T>((res, rej) => {
    resolve = res
    reject = rej
  })
  return { promise, resolve, reject }
}
