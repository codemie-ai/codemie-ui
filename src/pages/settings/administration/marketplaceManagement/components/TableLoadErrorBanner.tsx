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

import { FC } from 'react'

import Button from '@/components/Button'

interface TableLoadErrorBannerProps {
  /** Headline, e.g. "Failed to load cleanup queue." */
  title: string
  /** Server/network detail shown after the headline. */
  detail?: string | null
  onRetry: () => void
  testId?: string
}

/**
 * Inline load-failure banner shown above a table when its fetch rejects.
 *
 * Shared by the cleanup and pending queues so both report failures the same
 * way — previously only the cleanup queue had a banner at all and the
 * pending queue swallowed load errors into `console.error`, leaving the
 * admin with a silent empty table.
 */
const TableLoadErrorBanner: FC<TableLoadErrorBannerProps> = ({
  title,
  detail,
  onRetry,
  testId,
}) => (
  <div
    role="alert"
    data-testid={testId}
    className="mt-3 flex items-center justify-between gap-3 rounded-md border border-failed-secondary/40 bg-failed-secondary/10 px-3 py-2 text-xs text-failed-secondary"
  >
    <span>
      <span className="font-semibold">{title}</span> {detail}
    </span>
    <Button variant="tertiary" className="h-7 shrink-0 text-xs" onClick={onRetry}>
      Retry
    </Button>
  </div>
)

export default TableLoadErrorBanner
