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

import { ReactNode, useId } from 'react'

import { cn } from '@/utils/utils'

export interface FieldAnnouncerRenderProps {
  ariaInvalid: boolean
  ariaDescribedBy: string | undefined
}

export interface FieldAnnouncerProps {
  id?: string
  error?: string
  errorClassName?: string
  /** Non-blocking amber message; ignored while `error` is set. */
  warning?: string
  /** Extra classes for the warning node, added to the shared amber styling. */
  warningClassName?: string
  /** Caller-supplied description ids (e.g. a hint); the error or warning id is appended to them. */
  describedBy?: string
  children: (props: FieldAnnouncerRenderProps) => ReactNode
}

/**
 * Owns the a11y contract for a form field's validation error and warning: computes
 * `aria-invalid` / `aria-describedby` and renders the `role="alert"` error node or the amber
 * warning node. The primitive decides where the aria props land (the element itself or a
 * PrimeReact `pt.input`).
 */
const FieldAnnouncer = ({
  id,
  error,
  errorClassName,
  warning,
  warningClassName,
  describedBy,
  children,
}: FieldAnnouncerProps) => {
  const reactId = useId()
  const errorId = `${id ?? reactId}-error`
  const warningId = `${id ?? reactId}-warning`
  const activeWarning = error ? undefined : warning
  const ariaDescribedBy =
    [describedBy, error ? errorId : undefined, activeWarning ? warningId : undefined]
      .filter(Boolean)
      .join(' ') || undefined

  return (
    <>
      {children({ ariaInvalid: !!error, ariaDescribedBy })}
      {error && (
        // role="alert" fires only on DOM insertion, so re-mount the node when the text changes
        <div key={error} id={errorId} role="alert" className={errorClassName}>
          {error}
        </div>
      )}
      {activeWarning && (
        <div id={warningId} className={cn('text-sm text-aborted-primary', warningClassName)}>
          {activeWarning}
        </div>
      )}
    </>
  )
}

export default FieldAnnouncer
