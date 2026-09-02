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

import React, { useEffect, useState } from 'react'

import AlertIcon from '@/assets/icons/alert.svg?react'
import ApplicationsIcon from '@/assets/icons/applications.svg?react'
import ArrowLeftIcon from '@/assets/icons/arrow-left.svg?react'
import AttachmentIcon from '@/assets/icons/attachment.svg?react'
import ChatArrowIcon from '@/assets/icons/chat-arrow.svg?react'
import ChatIcon from '@/assets/icons/chat.svg?react'
import CheckIcon from '@/assets/icons/check.svg?react'
import ChevronLeftIcon from '@/assets/icons/chevron-left.svg?react'
import ChevronRightIcon from '@/assets/icons/chevron-right.svg?react'
import CogIcon from '@/assets/icons/cog.svg?react'
import CrossIcon from '@/assets/icons/cross.svg?react'
import CurrencyIcon from '@/assets/icons/currency.svg?react'
import DeleteIcon from '@/assets/icons/delete.svg?react'
import DownloadIcon from '@/assets/icons/download.svg?react'
import EditIcon from '@/assets/icons/edit.svg?react'
import ExportIcon from '@/assets/icons/export.svg?react'
import EyeOffIcon from '@/assets/icons/eye-off.svg?react'
import EyeIcon from '@/assets/icons/eye.svg?react'
import FolderIcon from '@/assets/icons/folder.svg?react'
import HamburgerIcon from '@/assets/icons/hamburger.svg?react'
import HistoryIcon from '@/assets/icons/history.svg?react'
import InfoIcon from '@/assets/icons/info.svg?react'
import NavigationMoreIcon from '@/assets/icons/navigation-more.svg?react'
import NotificationIcon from '@/assets/icons/notification.svg?react'
import PaperIcon from '@/assets/icons/paper.svg?react'
import PinIcon from '@/assets/icons/pin.svg?react'
import PlayIcon from '@/assets/icons/play.svg?react'
import PlusIcon from '@/assets/icons/plus.svg?react'
import ProtectIcon from '@/assets/icons/protect.svg?react'
import QuestionCircleIcon from '@/assets/icons/question-circle.svg?react'
import QuestionIcon from '@/assets/icons/question.svg?react'
import RefreshIcon from '@/assets/icons/refresh.svg?react'
import SearchIcon from '@/assets/icons/search.svg?react'
import ShareIcon from '@/assets/icons/share.svg?react'
import StarFilledIcon from '@/assets/icons/star-filled.svg?react'
import StarOutlineIcon from '@/assets/icons/star-outline.svg?react'
import StopIcon from '@/assets/icons/stop.svg?react'
import UserIcon from '@/assets/icons/user.svg?react'
import VideoIcon from '@/assets/icons/video.svg?react'
import DsButton from '@/components/Button'
import DatePicker from '@/components/form/DatePicker'
import { ButtonType } from '@/constants'
import { cn } from '@/utils/utils'

import {
  ariaAttributes,
  type A2uiRenderProps,
  type InputRenderProps,
  type MediaRenderProps,
} from './factory'
import { A2uiMediaPlaceholder } from './fallback'
import { useA2uiSubmittedAction, useIsModalTrigger } from './surfaceContext'


/**
 * Marks a subtree as already styled by the design system.
 *
 * `theme.css` dresses the catalog's own controls, which the SDK ships without usable
 * classes; those rules are written to skip anything under this one, so a component of ours
 * keeps its own appearance instead of collecting a second border.
 */
const OWN_STYLING = 'a2ui-own'

/**
 * The components we draw ourselves.
 *
 * Everything else in the catalog is rendered by the SDK — see `registry.tsx` for which is
 * which and why. What lands here earns its place: agent-authored media that must not be
 * fetched without consent, icons whose artwork is ours, a Button that must not submit when
 * it triggers a dialog, and the product's own date picker.
 */

// --------------------------------------------------------------------------
// Text
// --------------------------------------------------------------------------

const IMAGE_VARIANT_STYLES: Record<string, string> = {
  icon: 'w-5 h-5',
  avatar: 'w-10 h-10 rounded-full object-cover',
  smallFeature: 'max-w-40',
  mediumFeature: 'max-w-80',
  largeFeature: 'max-w-[480px]',
  header: 'w-full max-h-64',
}

const IMAGE_FIT_STYLES: Record<string, string> = {
  contain: 'object-contain',
  cover: 'object-cover',
  fill: 'object-fill',
  none: 'object-none',
  scaleDown: 'object-scale-down',
}

/**
 * Privacy attributes shared by every agent-authored media element.
 *
 * `referrerPolicy` keeps the conversation/assistant identifiers that live in the
 * chat URL out of the request. Credentials are not additionally suppressed with
 * `crossOrigin`: it would force a CORS-mode fetch and break every host that does
 * not send `Access-Control-Allow-Origin`, while cross-site cookies on subresource
 * requests are already withheld by the SameSite default.
 */
const MEDIA_PRIVACY_PROPS = {
  referrerPolicy: 'no-referrer',
} as const

/**
 * A catalog property read as the name of a style variant.
 *
 * Everything on `rest` is agent-authored and typed `unknown`, so `String(value)` would
 * happily turn an object into "[object Object]" and look up a style under that. Only a
 * string can name a variant; anything else falls back to the default.
 */
const asName = (value: unknown, fallback: string): string => (typeof value === 'string' ? value : fallback)

export const ImageRenderer: React.FC<MediaRenderProps> = ({ url, rest }) => {
  // The URL is agent-authored and often simply wrong (the first one seen in practice was
  // an invented 404). A browser's broken-image icon explains nothing, so a failed load
  // degrades to the same placeholder an unsafe URL gets.
  const [failed, setFailed] = useState(false)
  if (failed) return <A2uiMediaPlaceholder label="Image" />
  return (
    <img
      src={url}
      alt={typeof rest.description === 'string' ? rest.description : ''}
      loading="lazy"
      onError={() => setFailed(true)}
      {...MEDIA_PRIVACY_PROPS}
      className={cn(
        'rounded-lg',
        IMAGE_VARIANT_STYLES[asName(rest.variant, 'mediumFeature')] ?? IMAGE_VARIANT_STYLES.mediumFeature,
        IMAGE_FIT_STYLES[asName(rest.fit, 'fill')] ?? IMAGE_FIT_STYLES.fill
      )}
    />
  )
}

/**
 * The full `Icon.name` enum of the Basic Catalog mapped onto the design-system
 * SVG set (registry, not if-chains).
 *
 * The backend advertises the whole enum to the model, so any name in it is an
 * ordinary thing to receive: every entry resolves to the closest available
 * design-system glyph. Names with no reasonable counterpart in the set (phone
 * and volume controls) intentionally fall through to DEFAULT_ICON rather than
 * borrowing an unrelated glyph — the accessible label always carries the exact
 * catalog name either way.
 */
const ICON_COMPONENTS: Record<string, React.FC<React.SVGProps<SVGSVGElement>>> = {
  accountCircle: UserIcon,
  add: PlusIcon,
  arrowBack: ArrowLeftIcon,
  arrowForward: ChevronRightIcon,
  attachFile: AttachmentIcon,
  calendarToday: HistoryIcon,
  camera: VideoIcon,
  check: CheckIcon,
  close: CrossIcon,
  delete: DeleteIcon,
  download: DownloadIcon,
  edit: EditIcon,
  error: AlertIcon,
  event: HistoryIcon,
  fastForward: ChevronRightIcon,
  favorite: StarFilledIcon,
  favoriteOff: StarOutlineIcon,
  folder: FolderIcon,
  help: QuestionCircleIcon,
  home: ApplicationsIcon,
  info: InfoIcon,
  locationOn: PinIcon,
  lock: ProtectIcon,
  lockOpen: ProtectIcon,
  mail: ChatIcon,
  menu: HamburgerIcon,
  moreHoriz: NavigationMoreIcon,
  moreVert: NavigationMoreIcon,
  notifications: NotificationIcon,
  notificationsOff: NotificationIcon,
  pause: StopIcon,
  payment: CurrencyIcon,
  person: UserIcon,
  photo: VideoIcon,
  play: PlayIcon,
  print: PaperIcon,
  refresh: RefreshIcon,
  rewind: ChevronLeftIcon,
  search: SearchIcon,
  send: ChatArrowIcon,
  settings: CogIcon,
  share: ShareIcon,
  shoppingCart: CurrencyIcon,
  skipNext: ChevronRightIcon,
  skipPrevious: ChevronLeftIcon,
  star: StarOutlineIcon,
  starHalf: StarOutlineIcon,
  starOff: StarOutlineIcon,
  stop: StopIcon,
  upload: ExportIcon,
  visibility: EyeIcon,
  visibilityOff: EyeOffIcon,
  warning: AlertIcon,
}

/**
 * Rendered for icon names with no design-system counterpart, and for the
 * catalog's custom `{svgPath}` form (agent-authored path data is never injected
 * into the DOM). A real glyph, never an empty box.
 */
const DEFAULT_ICON = QuestionIcon

export const IconRenderer: React.FC<A2uiRenderProps> = ({ props }) => {
  const name = typeof props.name === 'string' ? props.name : ''
  const IconSvg = ICON_COMPONENTS[name] ?? DEFAULT_ICON
  return (
    <IconSvg
      // Decorative: the meaning is carried by the text the catalog puts beside it, and an
      // icon that announces its own name ("info") only adds noise to that sentence. An
      // agent that wants it announced sets `accessibility.label`, which the common wrapper
      // applies — Icon does not own its accessibility.
      aria-hidden="true"
      className="w-4 h-4 shrink-0 text-text-primary"
    />
  )
}

export const VideoRenderer: React.FC<MediaRenderProps> = ({ url }) => {
  // A plain <video> plays a media file; agents routinely pass a watch/share page instead,
  // which can never play. Silence would leave an empty player with no hint why.
  const [failed, setFailed] = useState(false)
  if (failed) return <A2uiMediaPlaceholder label="Video" />
  return (
    // eslint-disable-next-line jsx-a11y/media-has-caption -- agent-authored media has no caption track
    <video
      controls
      src={url}
      preload="none"
      onError={() => setFailed(true)}
      {...MEDIA_PRIVACY_PROPS}
      className="max-w-full rounded-lg"
    />
  )
}

export const AudioPlayerRenderer: React.FC<MediaRenderProps> = ({ url, rest }) => {
  const [failed, setFailed] = useState(false)
  return (
    <div className="flex flex-col gap-1 w-full">
      {typeof rest.description === 'string' && rest.description && (
        <span className="text-xs text-text-tertiary">{rest.description}</span>
      )}
      {failed ? (
        <A2uiMediaPlaceholder label="Audio" />
      ) : (
        // eslint-disable-next-line jsx-a11y/media-has-caption -- agent-authored media has no caption track
        <audio
          controls
          src={url}
          preload="none"
          onError={() => setFailed(true)}
          {...MEDIA_PRIVACY_PROPS}
          className="w-full"
        />
      )}
    </div>
  )
}

// --------------------------------------------------------------------------
// Layout: Row / Column / List / Card / Tabs / Modal / Divider
// --------------------------------------------------------------------------

const BUTTON_TYPE_BY_VARIANT: Record<string, ButtonType> = {
  default: ButtonType.BASE,
  primary: ButtonType.PRIMARY,
  borderless: ButtonType.TERTIARY,
}

export const ButtonRenderer: React.FC<A2uiRenderProps> = ({ props, buildChild, context }) => {
  const dispatch = typeof props.action === 'function' ? (props.action as () => void) : undefined
  // A Modal's trigger opens the dialog; its declared action exists only because the
  // catalog makes `action` required on Button, and dispatching it would submit the
  // surface and end the turn before the dialog could be seen.
  const componentId = context?.componentModel?.id
  const isModalTrigger = useIsModalTrigger(componentId)
  // Suppressed, not replaced: the catalog's Modal wraps its trigger in an element that
  // opens the dialog on click, so the click still lands once this stops dispatching.
  const action = isModalTrigger ? undefined : dispatch
  const submittedAction = useA2uiSubmittedAction()
  const isSubmittedAction = Boolean(
    submittedAction?.componentId && submittedAction.componentId === componentId
  )
  return (
    <DsButton
      type={BUTTON_TYPE_BY_VARIANT[asName(props.variant, 'default')] ?? ButtonType.BASE}
      disabled={props.isValid === false}
      onClick={action}
      // An answered surface is read-only, so the only thing left saying WHICH action was
      // taken is this button. Without it a form offering Approve / Reject / Defer looks
      // the same afterwards whichever was pressed, and the chip above shows field values
      // rather than the action for a data-model answer.
      className={cn(isSubmittedAction && 'a2ui-answered')}
      aria-pressed={isSubmittedAction || undefined}
      {...ariaAttributes(props)}
      {...(isSubmittedAction ? { 'data-testid': `a2ui-selected-${submittedAction!.name}` } : {})}
    >
      {typeof props.child === 'string' && buildChild ? buildChild(props.child) : null}
    </DsButton>
  )
}

// --------------------------------------------------------------------------
// Inputs: TextField / CheckBox / ChoicePicker / Slider / DateTimeInput
// --------------------------------------------------------------------------

/** Shown when a field's `validationRegexp` does not match what the user typed. */
// --------------------------------------------------------------------------
// DateTimeInput: the product's own picker
// --------------------------------------------------------------------------

const padTwo = (part: number) => String(part).padStart(2, '0')

/** Formats a picked date into the protocol's local date/time string shape. */
export function formatDateTimeValue(date: Date, enableTime: boolean): string {
  const datePart = `${date.getFullYear()}-${padTwo(date.getMonth() + 1)}-${padTwo(date.getDate())}`
  if (!enableTime) return datePart
  return `${datePart}T${padTwo(date.getHours())}:${padTwo(date.getMinutes())}`
}

const extractTimePart = (raw: string): string => {
  const source = raw.includes('T') ? raw.split('T')[1] ?? '' : raw
  return source.substring(0, 5)
}

export const DateTimeInputRenderer: React.FC<InputRenderProps<string>> = ({
  label,
  value,
  setValue,
  validationErrors,
  aria,
  rest,
}) => {
  const enableTime = Boolean(rest.enableTime)
  // Both flags default to false in the schema, so an agent that sets neither is
  // still emitting a valid component. Rendering nothing would leave an invisible
  // field that can block submission through its own checks; a date picker is the
  // safe reading of "date/time input" and matches the catalog's own naming.
  const enableDate = Boolean(rest.enableDate) || !enableTime
  const error = validationErrors[0]
  // Same reason as TextField: an unbound date must read as "" so a format check written
  // to accept an empty value can actually match it.
  const needsEmptyString = value == null
  useEffect(() => {
    if (needsEmptyString) setValue('')
  }, [needsEmptyString, setValue])
  const text = typeof value === 'string' ? value : ''

  if (!enableDate) {
    // Time-only field: the DS DatePicker is date-based, use a native time input.
    return (
      <div className={cn(OWN_STYLING, 'flex flex-col gap-2')}>
        {label && <div className="text-xs text-text-quaternary">{label}</div>}
        <input
          type="time"
          value={extractTimePart(text)}
          onChange={(e) => setValue(e.target.value)}
          min={typeof rest.min === 'string' ? extractTimePart(rest.min) : undefined}
          max={typeof rest.max === 'string' ? extractTimePart(rest.max) : undefined}
          className="h-8 w-full px-2 text-sm text-text-primary bg-surface-base-content border border-border-primary rounded-lg transition hover:border-border-secondary focus:outline-none"
          {...(aria ?? {})}
        />
        {error && <div className="text-sm text-failed-secondary">{error}</div>}
      </div>
    )
  }

  return (
    <div className={OWN_STYLING}>
      <DatePicker
        label={label}
        value={text || null}
        error={error}
        showTime={enableTime}
        minDate={typeof rest.min === 'string' ? rest.min : undefined}
        maxDate={typeof rest.max === 'string' ? rest.max : undefined}
        onChange={(iso) => setValue(iso ? formatDateTimeValue(new Date(iso), enableTime) : '')}
        {...(aria ?? {})}
      />
    </div>
  )
}
