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

import { useEffect, useId, useRef, useState } from 'react'

import DeleteSvg from '@/assets/icons/delete.svg?react'
import Button from '@/components/Button'
import { HOSTED_COVER_MAX_BYTES, HOSTED_COVER_TYPES } from '@/store/hostedApplications'
import type { HostedApplication } from '@/types/entity/hostedApplication'
import { cn } from '@/utils/utils'

import HostedApplicationCover from './HostedApplicationCover'

/** The cover the form will save: a new image, the removal of the current one, or no change. */
export interface HostedCoverChange {
  file: File | null
  removed: boolean
}

// A catalog card's cover width at the common desktop layout; the form preview is that cover at this scale.
const CARD_COVER_WIDTH = 360
const PREVIEW_SCALE = 0.5

export const NO_COVER_CHANGE: HostedCoverChange = { file: null, removed: false }

export const HOSTED_COVER_HINT =
  'PNG, JPEG, or WebP up to 1 MiB and 2048 px. Without one, the card shows the app initials.'

/** Why `file` cannot be a cover, or `null` when it can; the server checks the pixel size. */
export const hostedCoverError = (file: File): string | null => {
  if (!HOSTED_COVER_TYPES.includes(file.type)) return 'Choose a PNG, JPEG, or WebP image.'
  if (!file.size || file.size > HOSTED_COVER_MAX_BYTES) return 'Choose an image up to 1 MiB.'
  return null
}

interface Props {
  /** The saved application, whose current cover is shown until a change replaces it. */
  application?: HostedApplication | null
  /** The name as typed, so the generated cover shows the initials and colour it will get. */
  name?: string
  value: HostedCoverChange
  onChange(value: HostedCoverChange): void
  disabled?: boolean
}

/** A local preview of the chosen image; the object URL lives as long as the file is chosen. */
const useObjectUrl = (file: File | null) => {
  const [url, setUrl] = useState<string | null>(null)
  useEffect(() => {
    if (!file || typeof URL.createObjectURL !== 'function') {
      setUrl(null)
      return () => {}
    }
    const next = URL.createObjectURL(file)
    setUrl(next)
    return () => URL.revokeObjectURL(next)
  }, [file])
  return url
}

/**
 * The card cover of a hosted application in its create and edit form, laid out like the assistant
 * logo row: the cover on the left, Upload and Remove beside it. Nothing is sent until the form saves.
 */
const HostedCoverField = ({ application, name, value, onChange, disabled = false }: Props) => {
  const labelId = useId()
  const input = useRef<HTMLInputElement>(null)
  const [error, setError] = useState<string | null>(null)
  const preview = useObjectUrl(value.file)
  const current = !!application && !value.removed
  const removable = !!value.file || (current && !!application?.has_cover)
  const typed = name?.trim() || application?.name || ''
  // Without a chosen or kept image the card shows the generated cover for the name as typed.
  const shown = {
    ...(application ?? { id: '', has_active_version: false }),
    name: typed,
    has_cover: current && !!application?.has_cover,
  } as HostedApplication

  const choose = (file?: File) => {
    if (!file) return
    const message = hostedCoverError(file)
    setError(message)
    if (!message) onChange({ file, removed: false })
  }
  const remove = () => {
    setError(null)
    onChange({ file: null, removed: !!application?.has_cover })
  }

  return (
    <fieldset aria-labelledby={labelId} className="m-0 flex min-w-0 flex-col gap-2 border-0 p-0">
      <span id={labelId} className="text-xs text-text-quaternary">
        Cover (optional)
      </span>
      <div className="flex flex-row flex-wrap items-center gap-4">
        <div
          data-testid="hosted-cover-field-preview"
          className="aspect-card-cover shrink-0 overflow-hidden rounded-lg border border-border-structural"
          style={{ width: CARD_COVER_WIDTH * PREVIEW_SCALE }}
        >
          {/* The cover is drawn at a catalog card's size and scaled down, so text and proportions match the card. */}
          <div
            className="aspect-card-cover origin-top-left"
            style={{ width: CARD_COVER_WIDTH, transform: `scale(${PREVIEW_SCALE})` }}
          >
            {preview ? (
              <img
                src={preview}
                alt="Selected cover"
                className="size-full object-cover object-center"
              />
            ) : (
              <HostedApplicationCover application={shown} loadImage={current} />
            )}
          </div>
        </div>
        {!disabled && (
          <div className="flex flex-row flex-wrap items-center gap-2">
            <Button
              type="primary"
              size="small"
              onClick={() => input.current?.click()}
              className="h-7 w-32 shrink-0 gap-2 px-2 font-mono text-xs font-semibold"
            >
              {removable ? 'Replace cover' : 'Upload cover'}
            </Button>
            {removable && (
              <Button
                variant="secondary"
                size="small"
                onClick={remove}
                className={cn(
                  'h-7 w-32 shrink-0 gap-1.5 px-2 font-mono text-xs font-semibold',
                  '!border-failed-secondary !text-failed-secondary hover:!bg-failed-secondary/10'
                )}
              >
                <DeleteSvg aria-hidden className="size-[18px] shrink-0" />
                Remove cover
              </Button>
            )}
          </div>
        )}
      </div>
      <input
        ref={input}
        type="file"
        accept={HOSTED_COVER_TYPES.join(',')}
        className="hidden"
        aria-label="Cover image"
        disabled={disabled}
        onChange={(event) => {
          choose(event.target.files?.[0])
          event.target.value = ''
        }}
      />
      <p className="text-xs text-text-quaternary">{HOSTED_COVER_HINT}</p>
      {error && (
        <p role="alert" className="text-xs text-failed-secondary">
          {error}
        </p>
      )}
    </fieldset>
  )
}

export default HostedCoverField
