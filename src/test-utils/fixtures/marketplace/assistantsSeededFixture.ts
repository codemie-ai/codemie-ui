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

import type { AssistantRow } from '@/store/marketplaceManagement'

/**
 * Three synthetic `AssistantRow` objects covering the three reachable
 * marketplace statuses so page-level tests can assert on the status column,
 * row-action menus, and bulk-action guard without a live backend.
 *
 * Values are deterministic literals — no epoch timestamps that vary with
 * Date.now() — so snapshots comparing them stay stable across runs.
 */
export const assistantsSeededFixture: AssistantRow[] = [
  {
    assistant_id: 'a-verified',
    name: 'Verified Bot',
    marketplace_status: 'APPROVED',
    is_verified: true,
    gate_findings: [],
    categories: [],
    gate_recompute_failed: false,
    marketplace_decision_reason: null,
  },
  {
    assistant_id: 'a-pending-crit',
    name: 'Pending Critical',
    marketplace_status: 'PENDING_REVIEW',
    is_verified: false,
    gate_findings: [{ severity: 'CRITICAL', rule: 'r1', message: 'bad' }],
    categories: [],
    gate_recompute_failed: false,
    marketplace_decision_reason: null,
  },
  {
    assistant_id: 'a-rejected',
    name: 'Rejected Bot',
    marketplace_status: 'REJECTED',
    is_verified: false,
    gate_findings: [],
    categories: [],
    gate_recompute_failed: false,
    marketplace_decision_reason: 'Does not meet policy',
  },
]
