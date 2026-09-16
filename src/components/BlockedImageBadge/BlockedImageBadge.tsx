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

import { FC } from 'react'

import EyeOffSvg from '@/assets/icons/eye-off.svg?react'
import { extractHostname } from '@/utils/imageAllowList'

export const BLOCKED_IMAGE_BADGE_CLASS = 'blocked-image-badge'
export const BLOCKED_IMAGE_BADGE_TITLE = 'Image not displayed: domain is not on the allow-list'

// The badge sits inline in a paragraph of assistant prose, so without its own treatment it reads as
// part of the sentence. The dashed outline, tinted chip and monospace text mark it as a placeholder
// for missing content rather than as body copy.
//
// The type utilities carry `!` because the markdown stylesheet styles every descendant of a
// rendered <p> — `.markdown … p :not(.code-block)` sets font-size/line-height — and a descendant
// selector outranks a plain utility class, so the chip would silently render at body-copy size.
const BLOCKED_IMAGE_BADGE_STYLE =
  'inline-flex items-center gap-1 align-middle mx-0.5 px-1.5 max-w-full rounded border border-dashed border-border-subtle bg-surface-elevated font-mono !text-xs !leading-5 text-text-info break-all'

// That same markdown rule also sets `margin-bottom: 0.5rem` on descendants. Left alone it turns the
// icon's 1em box into a margin box exactly as tall as the flex line, leaving `items-center` nothing
// to centre, so the glyph sits ~4px above the label. Pinning the size and clearing the margin keeps
// the icon independent of whatever the surrounding prose styles inherit onto it.
export const BLOCKED_IMAGE_ICON_CLASS = 'shrink-0 !m-0 h-3.5 w-3.5'

// Markdown.sanitize.ts builds the same badge as a plain DOM node, and the drift test in
// Markdown.sanitize.test.tsx compares the two className strings — both paths must use this constant.
export const BLOCKED_IMAGE_BADGE_CLASS_NAME = `${BLOCKED_IMAGE_BADGE_CLASS} ${BLOCKED_IMAGE_BADGE_STYLE}`

export const getBlockedImageLabel = (hostname?: string): string =>
  hostname ? `Image from ${hostname} blocked` : 'Image from untrusted domain blocked'

interface BlockedImageBadgeProps {
  src: string
}

const BlockedImageBadge: FC<BlockedImageBadgeProps> = ({ src }) => {
  if (!src.trim()) return null
  const hostname = extractHostname(src)
  return (
    <span
      className={BLOCKED_IMAGE_BADGE_CLASS_NAME}
      data-blocked-image-hostname={hostname}
      title={BLOCKED_IMAGE_BADGE_TITLE}
    >
      {/* Decorative: the label beside it already carries the same meaning for screen readers */}
      <EyeOffSvg className={BLOCKED_IMAGE_ICON_CLASS} aria-hidden="true" focusable="false" />
      {getBlockedImageLabel(hostname)}
    </span>
  )
}

export default BlockedImageBadge
