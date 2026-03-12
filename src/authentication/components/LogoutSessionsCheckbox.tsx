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

import type { ReactNode } from 'react'

interface LogoutSessionsCheckboxProps {
  checked: boolean
  onChange: (checked: boolean) => void
  label: ReactNode
}

export default function LogoutSessionsCheckbox({
  checked,
  onChange,
  label,
}: LogoutSessionsCheckboxProps) {
  return (
    <div className="flex items-center gap-2">
      <input
        type="checkbox"
        id="logout-sessions"
        name="logout-sessions"
        value="on"
        checked={checked}
        onChange={(e) => onChange(e.target.checked)}
        className="h-4 w-4 cursor-pointer rounded border-border-structural bg-surface-primary text-border-accent transition hover:border-border-accent focus:ring-2 focus:ring-border-accent focus:ring-offset-0"
      />
      <label htmlFor="logout-sessions" className="cursor-pointer text-sm text-text-secondary">
        {label}
      </label>
    </div>
  )
}
