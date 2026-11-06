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

// Typography used only by the Session Details view. Shared analytics components keep their own
// defaults and carry nothing for the shared widgets, so other CLI Analytics tabs are not restyled.

/** Label and value of a stat block inside the timeline detail panel (mirrors `MetricCard`). */
export const SESSION_STAT_LABEL_CLASS =
  'text-[11px] font-semibold uppercase tracking-[0.03em] leading-4 text-text-quaternary'
export const SESSION_STAT_VALUE_CLASS =
  'text-lg font-semibold leading-snug tracking-tight text-text-primary tabular-nums'
