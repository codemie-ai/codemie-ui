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

import { FC, useEffect, useLayoutEffect, useRef, useState } from 'react'

export interface BudgetAmountInputProps {
  value: number
  onCommit: (n: number) => void
  className: string
  ariaLabel: string
}

const BudgetAmountInput: FC<BudgetAmountInputProps> = ({
  value,
  onCommit,
  className,
  ariaLabel,
}) => {
  const [draft, setDraft] = useState<string>(() => String(Math.round(value)))
  const focusedRef = useRef(false)
  const userTypingRef = useRef(false)
  const inputRef = useRef<HTMLInputElement>(null)
  const justSyncedWhileFocusedRef = useRef(false)

  useEffect(() => {
    // Don't overwrite what the user is actively typing. Only sync from
    // external changes (slider drag, total change) when the user hasn't
    // started editing this field since last focus.
    if (focusedRef.current && userTypingRef.current) return
    setDraft(String(Math.round(value)))
    if (focusedRef.current) justSyncedWhileFocusedRef.current = true
  }, [value])

  useLayoutEffect(() => {
    if (!justSyncedWhileFocusedRef.current) return
    justSyncedWhileFocusedRef.current = false
    const el = inputRef.current
    if (el && document.activeElement === el) el.select()
  }, [draft])

  return (
    <input
      ref={inputRef}
      type="number"
      min={0}
      value={draft}
      onFocus={(e) => {
        focusedRef.current = true
        userTypingRef.current = false
        const el = e.currentTarget
        setTimeout(() => {
          if (focusedRef.current && document.activeElement === el) el.select()
        }, 0)
      }}
      onChange={(e) => {
        userTypingRef.current = true
        setDraft(e.target.value)
      }}
      onBlur={() => {
        focusedRef.current = false
        userTypingRef.current = false
        const n = Number(draft)
        if (Number.isFinite(n) && n >= 0) {
          onCommit(n)
        }
        setDraft(String(Math.round(value)))
      }}
      onKeyDown={(e) => {
        if (e.key === 'Enter') (e.target as HTMLInputElement).blur()
      }}
      aria-label={ariaLabel}
      className={className}
    />
  )
}

export default BudgetAmountInput
