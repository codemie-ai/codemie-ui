#!/usr/bin/env bash
# Copyright 2026 EPAM Systems, Inc. ("EPAM")
#
# Licensed under the Apache License, Version 2.0 (the "License");
# you may not use this file except in compliance with the License.
# You may obtain a copy of the License at
#
#     http://www.apache.org/licenses/LICENSE-2.0
#
# Unless required by applicable law or agreed to in writing, software
# distributed under the License is distributed on an "AS IS" BASIS,
# WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
# See the License for the specific language governing permissions and
# limitations under the License.

# SUPERSEDED — this is a shim, not the capture logic.
#
# EXECUTION-PLAN 10.6 replaced this script with
# `codemie-ui/scripts/refresh-marketplace-fixtures.mjs`, wired to
# `npm run fixtures:refresh`. The rewrite exists because this script could not
# produce `pending-seeded.json`: the moderation queue is empty at rest, so the
# `PendingRow` contract had no captured row to be compared against and F-31 went
# unasserted. The Node script seeds a submission through the real publish
# endpoint, captures the row, and deletes the assistant again.
#
# Two divergent capture paths writing the same directory is how a fixture drifts
# unnoticed, so this file only forwards. Use the npm script directly.
#
#   npm run fixtures:refresh
#   npm run fixtures:refresh -- --detail-id=<uuid> --similar-id=<uuid>
#
# BASE / DETAIL_ID / SIMILAR_ID are still honoured for callers that set them.
set -euo pipefail

HERE="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
UI_ROOT="$(cd "$HERE/../../../.." && pwd)"

echo "capture.sh is superseded; forwarding to 'npm run fixtures:refresh'." >&2

ARGS=()
[ -n "${BASE:-}" ] && ARGS+=("--base=$BASE")
[ -n "${DETAIL_ID:-}" ] && ARGS+=("--detail-id=$DETAIL_ID")
[ -n "${SIMILAR_ID:-}" ] && ARGS+=("--similar-id=$SIMILAR_ID")

exec node "$UI_ROOT/scripts/refresh-marketplace-fixtures.mjs" "${ARGS[@]+"${ARGS[@]}"}"
