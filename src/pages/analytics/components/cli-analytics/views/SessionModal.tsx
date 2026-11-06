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

import { useRef, type FC } from 'react'

import Popup from '@/components/Popup'
import Spinner from '@/components/Spinner'
import Tooltip from '@/components/Tooltip'
import { useIsTruncated } from '@/hooks/useIsTruncated'
import { truncateInput } from '@/utils/helpers'

import SessionBody from './SessionBody'
import { useCliAnalyticsSession } from '../hooks/useCliAnalyticsSession'

interface SessionModalProps {
  traceId: string
  onHide: () => void
}

// Caps the title's displayed text and tooltip at a generous but bounded length — matching the
// convention Card.tsx uses for its own free-form tooltip text — since session prompts are
// user-typed and can be arbitrarily long (e.g. pasted logs), and an unbounded tooltip could grow
// taller than the viewport.
const MAX_TITLE_LENGTH = 1000

interface SessionTitleProps {
  traceId: string
  title: string
}

// Keyed by `title` in the parent, so the whole component remounts whenever the displayed text
// changes (e.g. the 'Session' loading placeholder swapping for the real prompt once the session
// loads). useIsTruncated only measures once on mount and re-measures on a ResizeObserver
// callback; ResizeObserver fires on the element's own box-size change, not on scrollWidth growing
// from new text while the box itself (constrained by flex-1) stays the same width — so without a
// remount, a later text swap would never be re-measured and the tooltip could permanently miss a
// truncated title.
const SessionTitle: FC<SessionTitleProps> = ({ traceId, title }) => {
  const titleRef = useRef<HTMLSpanElement>(null)
  const isTitleTruncated = useIsTruncated(titleRef)
  const tooltipTarget = `tooltip-target-session-title-${traceId}`

  return (
    <>
      <Tooltip target={'.' + tooltipTarget} position="bottom" showDelay={100} />
      <span
        ref={titleRef}
        data-pr-tooltip={isTitleTruncated ? title : ''}
        data-pr-position="bottom"
        className={`text-base font-semibold text-text-primary truncate ${tooltipTarget}`}
      >
        {title}
      </span>
    </>
  )
}

interface SessionSubtitleProps {
  traceId: string
  subtitle: string
}

// A dedicated component so useIsTruncated's ref attaches on this component's own first mount —
// i.e. once the subtitle already has real content. SessionModal's subtitle is only known after
// the session loads asynchronously, so calling the hook directly in SessionModal would attach
// the ref while the span doesn't exist yet (subtitle is still ''), and useIsTruncated's effect
// (deps: [ref], a stable object) never gets another chance to run once the span does mount.
// Also keyed by `subtitle` in the parent — if the subtitle text itself changes while this stays
// mounted (e.g. the session data refetches for the same trace), the same stale-measurement gap
// described on SessionTitle applies here too; the remount forces a fresh measurement.
const SessionSubtitle: FC<SessionSubtitleProps> = ({ traceId, subtitle }) => {
  const subtitleRef = useRef<HTMLSpanElement>(null)
  const isSubtitleTruncated = useIsTruncated(subtitleRef)
  const tooltipTarget = `tooltip-target-session-subtitle-${traceId}`

  return (
    <>
      <Tooltip target={'.' + tooltipTarget} position="bottom" showDelay={100} />
      <span
        ref={subtitleRef}
        data-pr-tooltip={isSubtitleTruncated ? subtitle : ''}
        data-pr-position="bottom"
        className={`text-xs text-text-secondary truncate ${tooltipTarget}`}
      >
        {subtitle}
      </span>
    </>
  )
}

const SessionModal: FC<SessionModalProps> = ({ traceId, onHide }) => {
  const { session, loading, error } = useCliAnalyticsSession(traceId)

  const title = truncateInput(session?.prompt, MAX_TITLE_LENGTH, 'Session')
  const subtitle = [
    session?.harness_name,
    session?.model_name,
    session?.repository,
    session?.branch,
    session?.delivery_framework,
  ]
    .filter(Boolean)
    .join(' · ')

  return (
    <Popup
      visible={true}
      onHide={onHide}
      hideFooter
      // isFullWidth gives w-full max-w-[90vw] xl:max-w-6xl. The arbitrary
      // max-w-[90vw] lives inside Popup.tsx, not here — acceptable per
      // styling-guide exception for the Popup primitive.
      isFullWidth
      headerContent={
        <div className="flex flex-col gap-0.5 min-w-0">
          <SessionTitle key={title} traceId={traceId} title={title} />
          {subtitle && <SessionSubtitle key={subtitle} traceId={traceId} subtitle={subtitle} />}
        </div>
      }
    >
      {loading && (
        <div className="flex justify-center items-center py-16">
          <Spinner />
        </div>
      )}
      {error && !loading && <p className="text-sm py-8 text-center text-text-failed">{error}</p>}
      {!loading && !error && !session && (
        <p className="text-sm py-8 text-center text-text-secondary">No data for this session.</p>
      )}
      {session && !loading && !error && <SessionBody session={session} />}
    </Popup>
  )
}

export default SessionModal
