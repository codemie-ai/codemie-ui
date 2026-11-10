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

import type { ReactNode } from 'react'

// The badge fills the bottom-right quarter (centred at 75%, as the corner dot of a 2x2 icon grid); the notch shares
// its centre and is a little wider, so the badge stands clear of the base. Sizes are relative so the icon scales.
const NOTCH_MASK = 'radial-gradient(33% 33% at 75% 75%, transparent 98%, #000 100%)'

interface Props {
  /** Any entity icon, for example `<ApplicationsSvg />`. */
  icon: ReactNode
  className?: string
}

/**
 * An entity icon marked as "yours": the icon with a small person badge in its bottom-right corner. Use it for
 * tabs that list what the user created, such as My apps, beside the plain entity icon used for the project tab.
 * Everything paints in `currentColor`, so the badge follows the tab's active and theme colors.
 */
const OwnedIcon = ({ icon, className }: Props) => (
  <span
    aria-hidden
    data-testid="owned-icon"
    className={`relative inline-flex size-full min-h-[18px] min-w-[18px] ${className ?? ''}`}
  >
    <span
      className="flex size-full [&>svg]:size-full"
      style={{ WebkitMaskImage: NOTCH_MASK, maskImage: NOTCH_MASK }}
    >
      {icon}
    </span>
    <svg
      viewBox="0 0 8 8"
      className="absolute bottom-0 right-0 size-1/2"
      fill="currentColor"
      data-testid="owned-icon-badge"
    >
      <circle cx="4" cy="2.3" r="1.8" />
      <path d="M.4 8C.7 5.8 2.2 4.8 4 4.8S7.3 5.8 7.6 8Z" />
    </svg>
  </span>
)

export default OwnedIcon
