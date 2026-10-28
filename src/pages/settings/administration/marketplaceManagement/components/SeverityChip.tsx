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

import StatusChip from './StatusChip'

interface SeverityChipProps {
  /**
   * Raw severity from the audit payload — `critical` or `optional`. Typed
   * nullable because at least one generated finding shape carries it as
   * `Severity | null` (EPMCDME-14234, CR-007) — a required `string` here
   * hid that a missing value was a real, reachable case, not just a type
   * hole to ignore.
   */
  severity: string | null | undefined
  /** When set, prefixes the label with a count, e.g. "2 Critical". */
  count?: number
  className?: string
}

/**
 * Importance of a failed quality check.
 *
 * The backend emits `critical` / `optional`. "Optional" reads as "you may
 * ignore this", which is not what it means — the check is minor, not
 * discretionary — so it is presented as "Minor". Rendered as a chip to match
 * BucketChip and TierChip in the same tables; the raw value used to be printed
 * as bare lowercase text.
 */
const severityStyles: Record<string, string> = {
  critical: 'bg-failed-secondary/15 text-failed-secondary border-failed-secondary/40',
  optional: 'bg-surface-base-secondary text-text-tertiary border-border-structural',
}

const severityLabel: Record<string, string> = {
  critical: 'Critical',
  optional: 'Minor',
}

const SeverityChip: FC<SeverityChipProps> = ({ severity, count, className }) => {
  // `severity` is typed as a required `string`, but findings come straight
  // off a backend payload (EntityReviewDetail.gate_findings) with no runtime
  // validation, so a missing value is a real possibility, not just a type
  // hole. `severity?.toLowerCase()` below only guarded `key` — the fallback
  // then called `.replace` directly on the unguarded `severity`, throwing
  // and taking down the whole drawer for one missing field
  // (EPMCDME-14234, CR-007).
  const key = severity?.toLowerCase()
  const baseLabel =
    (key && severityLabel[key]) ??
    severity?.replace(/[_-]+/g, ' ').replace(/^./, (c) => c.toUpperCase()) ??
    'Unknown'
  const label = count != null ? `${count} ${baseLabel}` : baseLabel

  const chipClass =
    (key && severityStyles[key]) ??
    'bg-surface-base-secondary text-text-tertiary border-border-structural'

  return <StatusChip label={label} chipClass={chipClass} className={className} />
}

export default SeverityChip
