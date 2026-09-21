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

export interface FieldAnnouncerRenderProps {
  ariaInvalid: boolean
  ariaDescribedBy: string | undefined
}

export interface FieldAnnouncerProps {
  id?: string
  error?: string
  errorClassName?: string
  /** Caller-supplied description ids (e.g. a hint); the error id is appended to them. */
  describedBy?: string
  children: (props: FieldAnnouncerRenderProps) => ReactNode
}

/**
 * Owns the a11y contract for a form field's validation error: computes `aria-invalid` /
 * `aria-describedby` and renders the `role="alert"` error node. The primitive decides where
 * the aria props land (the element itself or a PrimeReact `pt.input`).
 */
const FieldAnnouncer = ({
  id,
  error,
  errorClassName,
  describedBy,
  children,
}: FieldAnnouncerProps) => {
  const reactId = useId()
  const errorId = `${id ?? reactId}-error`
  const ariaDescribedBy =
    [describedBy, error ? errorId : undefined].filter(Boolean).join(' ') || undefined

  return (
    <>
      {children({ ariaInvalid: !!error, ariaDescribedBy })}
      {error && (
        // role="alert" fires only on DOM insertion, so re-mount the node when the text changes
        <div key={error} id={errorId} role="alert" className={errorClassName}>
          {error}
        </div>
      )}
    </>
  )
}

export default FieldAnnouncer
