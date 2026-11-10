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

import { useEffect, useRef, useState, type CSSProperties } from 'react'

import {
  hostedApplicationsStore as store,
  hostedAuthenticationGeneration,
} from '@/store/hostedApplications'
import type { HostedApplication } from '@/types/entity/hostedApplication'
import { getAssistantAvatarColor, getAssistantInitials } from '@/utils/assistantAvatar'
import { cn } from '@/utils/utils'

import { canOpen, isManager } from './hostedAccess'

const KIND_LABEL = { html: 'HTML', zip: 'Static app' } as const

interface Props {
  application: HostedApplication
  className?: string
  /** False draws only the generated cover, e.g. in the form after the image was removed. */
  loadImage?: boolean
}

/**
 * The application's uploaded cover when it has one, otherwise soft blurred washes over the whole
 * cover in the colour an assistant without an icon gets for the same name, with the initials in
 * that colour. A cover never launches the app.
 */
const HostedApplicationCover = ({ application: app, className, loadImage = true }: Props) => {
  const element = useRef<HTMLDivElement>(null)
  const [seen, setSeen] = useState(false)
  const [image, setImage] = useState<{ url: string; epoch: number } | null>(null)
  const epoch = hostedAuthenticationGeneration()
  // An owner's uploaded cover is served before any version is accepted, and a manager gets the
  // selected version's image before its first activation, as the server already serves it.
  const fetchable =
    loadImage &&
    !!app.id &&
    (canOpen(app) || !!app.has_cover || (isManager(app) && !!app.selected_version_id))

  useEffect(() => {
    const node = element.current
    if (!node) return () => {}
    if (typeof IntersectionObserver === 'undefined') {
      setSeen(true)
      return () => {}
    }
    const observer = new IntersectionObserver((entries) => {
      if (entries.some((entry) => entry.isIntersecting)) setSeen(true)
    })
    observer.observe(node)
    return () => observer.disconnect()
  }, [])

  // Loaded once the card has been on screen; scrolling away does not discard or refetch it.
  useEffect(() => {
    let alive = true
    let url: string | null = null
    const controller = new AbortController()
    setImage(null)
    if (!seen || !fetchable) return () => {}
    const load = async () => {
      try {
        const blob = await store.getThumbnail(app.id, controller.signal)
        if (!alive || !blob || epoch !== hostedAuthenticationGeneration()) return
        url = URL.createObjectURL(blob)
        setImage({ url, epoch })
      } catch {
        /* An unavailable cover leaves the initials in place and never blocks the app. */
      }
    }
    load()
    return () => {
      alive = false
      controller.abort()
      if (url) URL.revokeObjectURL(url)
    }
  }, [
    seen,
    app.id,
    app.updated_at,
    app.active_version_id,
    app.selected_version_id,
    fetchable,
    epoch,
  ])

  const showImage = !!image && image.epoch === epoch
  return (
    <div
      ref={element}
      data-testid="hosted-cover"
      style={{ '--cover-color': getAssistantAvatarColor(app.name) } as CSSProperties}
      className={cn(
        'relative flex size-full items-center justify-center overflow-hidden bg-surface-base-secondary',
        className
      )}
    >
      {/* Soft, blurred washes of the name colour rather than a flat fill. */}
      <div
        aria-hidden
        className="absolute inset-0 opacity-50 blur-2xl"
        style={{
          background:
            'radial-gradient(60% 70% at 20% 15%, var(--cover-color), transparent 70%), radial-gradient(55% 65% at 85% 90%, var(--cover-color), transparent 70%)',
        }}
      />
      <div aria-hidden className="relative flex flex-col items-center gap-3">
        <span
          data-testid="hosted-cover-initials"
          className="text-[3.5rem] font-semibold leading-none tracking-wide text-[var(--cover-color)]"
        >
          {getAssistantInitials(app.name)}
        </span>
        {/* Without an active version there is nothing to run yet, so no kind to name. */}
        {app.artifact_kind && canOpen(app) && (
          <span className="rounded-full border border-border-structural bg-surface-base-primary px-2 py-0.5 text-xs-1 font-semibold uppercase tracking-wide text-text-quaternary">
            {KIND_LABEL[app.artifact_kind]}
          </span>
        )}
      </div>
      {showImage && (
        <img
          src={image.url}
          alt=""
          className="absolute inset-0 size-full object-cover object-top"
          onError={() => setImage(null)}
        />
      )}
    </div>
  )
}

export default HostedApplicationCover
