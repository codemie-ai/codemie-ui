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

/**
 * The three keys every producer uses to qualify one money figure, in that spelling. Exported for the
 * screens that iterate a raw metrics object and must tell an annotation apart from a metric, instead
 * of rendering `total_spend_unavailable: true` as a figure in its own right.
 */
export const SPEND_QUALIFICATION_FIELDS = [
  'spend_unavailable',
  'spend_partial',
  'spend_missing_amount',
] as const
