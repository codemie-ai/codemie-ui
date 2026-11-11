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
import { useSnapshot } from 'valtio'

import { responseReadyStore } from '@/store/responseReady'

/**
 * Screen-reader announcement for a completed response. The title prefix alone is not
 * reliably announced, so a polite live region carries the same signal as text.
 */
const ResponseReadyAnnouncer = () => {
  const { pending } = useSnapshot(responseReadyStore)

  return <output className="sr-only">{pending ? 'AI response ready' : null}</output>
}

export default ResponseReadyAnnouncer
