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

import { FC, ReactNode } from 'react'

import { formatDateTime } from '@/utils/helpers'

export const DASH = '—'

export const formatDate = (value?: string | null): string => (value ? formatDateTime(value) : DASH)

export interface FieldProps {
  label: string
  children: ReactNode
  testId?: string
  dataValue?: string | null
}

export const Field: FC<FieldProps> = ({ label, children, testId, dataValue }) => (
  <div className="flex min-w-0 flex-col gap-0.5">
    <span className="text-[11px] font-semibold uppercase tracking-wider text-text-tertiary">
      {label}
    </span>
    <span
      className="break-words text-xs text-text-primary"
      data-testid={testId}
      data-value={dataValue ?? undefined}
    >
      {children}
    </span>
  </div>
)

export const Section: FC<{ title: string; children: ReactNode; action?: ReactNode }> = ({
  title,
  children,
  action,
}) => (
  <section className="flex flex-col gap-3 border-t border-border-structural pt-4 first:border-t-0 first:pt-0">
    <div className="flex items-center justify-between gap-3">
      <h4 className="text-xs font-semibold uppercase tracking-wider text-text-secondary">
        {title}
      </h4>
      {action}
    </div>
    {children}
  </section>
)

export const Chips: FC<{ values: string[]; testId: string }> = ({ values, testId }) => (
  <div className="flex flex-wrap gap-1.5" data-testid={testId}>
    {values.length === 0 ? (
      <span className="text-xs text-text-tertiary">None</span>
    ) : (
      values.map((v) => (
        <span
          key={v}
          className="inline-flex items-center rounded-full border border-border-structural bg-surface-base-secondary px-2 py-0.5 text-[11px] leading-none text-text-primary"
        >
          {v}
        </span>
      ))
    )}
  </div>
)
