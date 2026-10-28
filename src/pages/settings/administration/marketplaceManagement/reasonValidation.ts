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
 * Client-side mirror of the queue's server-side reason bound (F-64).
 *
 * The authority is `_validate_reason` in
 * `codemie/src/codemie/rest_api/routers/marketplace_management.py`:
 *
 *     def _validate_reason(reason: str) -> None:
 *         n = len(reason.strip())
 *         if n < 20 or n > 2000:
 *             raise HTTPException(400, f"Reason must be 20–2000 chars (got {n}).")
 *
 * Three properties of that function are reproduced here deliberately, because
 * a client bound that disagrees with the server is its own bug:
 *
 *  - the length is measured on the **stripped** string, so a field of spaces
 *    is empty, not 40 characters long;
 *  - both ends are inclusive — exactly 20 and exactly 2000 are accepted;
 *  - the same bound covers the reject `reason` **and** the force-publish
 *    `override_notice`; the router calls `_validate_reason` for both.
 *
 * Everything that gates a submit button on a reason imports from here, so the
 * row-level popup and the bulk popup cannot drift apart from each other or
 * from the server.
 */

export const REASON_MIN_LENGTH = 20
export const REASON_MAX_LENGTH = 2000

/** Length the server will measure — the trimmed length, not the raw one. */
export const reasonLength = (value: string): number => value.trim().length

/** True when the server's `_validate_reason` would accept this text. */
export const isReasonWithinBounds = (value: string): boolean => {
  const n = reasonLength(value)
  return n >= REASON_MIN_LENGTH && n <= REASON_MAX_LENGTH
}

/**
 * Live counter shown under the textarea. Disabling the button without saying
 * why is what made the old behaviour indistinguishable from a broken form.
 */
export const reasonBoundHint = (value: string, label = 'Reason'): string =>
  `${label} must be ${REASON_MIN_LENGTH}–${REASON_MAX_LENGTH} characters (currently ${reasonLength(
    value
  )}).`
