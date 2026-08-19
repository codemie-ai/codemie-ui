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
 * The height budget the premium tip takes out of the chat-history panel.
 *
 * The tip renders as a `shrink-0` row inside that panel, so the panel's own
 * minimum has to account for it: at `minSize` with the tip mounted, the message
 * list would otherwise be squeezed toward zero while the tip kept its full
 * height. The slot caps itself at `PREMIUM_TIP_SLOT_MAX_HEIGHT` (scrolling past
 * it, which only a very narrow panel can trigger) so this number stays an upper
 * bound rather than a guess.
 */

/** Floor of the chat-history panel with no tip showing. */
export const CHAT_HISTORY_MIN_HEIGHT = 80

/** Upper bound on the tip row's height, slot padding included. */
export const PREMIUM_TIP_SLOT_MAX_HEIGHT = 96

export const chatHistoryPanelMinSize = (tipIsVisible: boolean) =>
  tipIsVisible ? CHAT_HISTORY_MIN_HEIGHT + PREMIUM_TIP_SLOT_MAX_HEIGHT : CHAT_HISTORY_MIN_HEIGHT
