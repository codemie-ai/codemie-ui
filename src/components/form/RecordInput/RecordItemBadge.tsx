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

import { ReactNode } from 'react'

export type RecordItemBadge = 'required' | 'optional'

const BADGE_LABELS: Record<RecordItemBadge, ReactNode> = {
  required: (
    <>
      required<span className="text-text-error ml-0.5">*</span>
    </>
  ),
  optional: 'optional',
}

const BADGE_BY_REQUIRED: Record<'true' | 'false', RecordItemBadge> = {
  true: 'required',
  false: 'optional',
}

export const recordBadgeFromRequired = (required: boolean | undefined): RecordItemBadge =>
  BADGE_BY_REQUIRED[`${Boolean(required)}`]

interface RecordItemBadgeViewProps {
  value?: RecordItemBadge
}

const RecordItemBadgeView = ({ value }: RecordItemBadgeViewProps): ReactNode => {
  if (!value) return null
  return (
    <span className="mt-0.5 text-xs inline-block text-text-quaternary">{BADGE_LABELS[value]}</span>
  )
}

export default RecordItemBadgeView
