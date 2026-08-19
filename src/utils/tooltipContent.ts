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
 * Joins the parts a dropdown row wants to say into the single `data-tooltip-content`
 * string it is allowed to carry — the full name when the row truncates it, the
 * premium rate sentence when the model is premium, both when both.
 *
 * One content string per row is the invariant: two same-id anchors in one
 * subtree make the tooltip flicker as the pointer crosses between them.
 */
export const composeRowTooltip = (parts: (string | false | null | undefined)[]) =>
  parts.filter(Boolean).join(' · ')
