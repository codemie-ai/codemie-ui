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

import { NavSectionItem } from './NavigationPinnedSection'

const ITEM_HEIGHT = 36
const ITEM_GAP = 6
// Approximate height of the rest of the desktop navigation (logo, links, profile, expand button).
const NAV_RESERVED_PX = 720
const MIN_UNCOLLAPSED_ITEMS = 2

export const computeUncollapsedSlots = (viewportHeight: number) =>
  Math.max(
    MIN_UNCOLLAPSED_ITEMS,
    Math.floor((viewportHeight - NAV_RESERVED_PX) / (ITEM_HEIGHT + ITEM_GAP))
  )

const BUBBLE_COLS_MANY = 4

export const normalizeName = (name: string) => name.replace('AI/Run', '')

export function computeExpandedBubbles(items: readonly NavSectionItem[], allFit: boolean) {
  if (allFit) {
    return { visible: [...items], overflow: [] as NavSectionItem[] }
  }
  const maxFullSlots = BUBBLE_COLS_MANY * 2
  if (items.length <= maxFullSlots) {
    return { visible: [...items], overflow: [] as NavSectionItem[] }
  }
  return {
    visible: [...items].slice(0, maxFullSlots),
    overflow: [...items].slice(maxFullSlots),
  }
}

export function computeCollapsedBubbles(items: readonly NavSectionItem[], allFit: boolean) {
  if (allFit) {
    return { visible: [...items], overflow: [] as NavSectionItem[] }
  }
  return { visible: [...items].slice(0, 2), overflow: [...items].slice(2) }
}
