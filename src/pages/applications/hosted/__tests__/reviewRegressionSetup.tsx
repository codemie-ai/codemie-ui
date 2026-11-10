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

import { cleanup } from '@testing-library/react'
import '@testing-library/jest-dom/vitest'
import { afterEach, vi } from 'vitest'

afterEach(cleanup)
// Test the feature's state transitions while replacing only shared UI primitives.
vi.mock('@/components/Button', () => ({
  default: ({ children, onClick, disabled, type = 'button' }: any) => (
    <button type={type} onClick={onClick} disabled={disabled}>
      {children}
    </button>
  ),
}))
vi.mock('@/components/Popup', () => ({
  default: ({ children, footerContent, header }: any) => (
    <dialog open aria-label={header}>
      {children}
      <footer>{footerContent}</footer>
    </dialog>
  ),
}))
vi.mock('@/components/Spinner', () => ({ default: () => <output>Loading</output> }))
vi.mock('@/components/form/Select', () => ({
  default: ({ id, label, value, disabled, options, onChangeValue }: any) => (
    <label htmlFor={id}>
      {label}
      <select
        id={id}
        value={value}
        disabled={disabled}
        onChange={(event) => onChangeValue(event.target.value)}
      >
        {options.map((item: any) => (
          <option key={item.value} value={item.value}>
            {item.label}
          </option>
        ))}
      </select>
    </label>
  ),
}))
vi.mock('@/components/form/Input', () => ({
  default: ({ label, ...props }: any) => (
    <label>
      {label}
      <input {...props} />
    </label>
  ),
}))
vi.mock('@/components/form/Textarea', () => ({
  default: ({ label, ...props }: any) => (
    <label>
      {label}
      <textarea {...props} />
    </label>
  ),
}))
vi.mock('@/components/form/Checkbox', () => ({
  Checkbox: ({ label, checked, disabled, onChange }: any) => (
    <label>
      {label}
      <input
        type="checkbox"
        checked={checked}
        disabled={disabled}
        onChange={(event) => onChange(event.target.checked)}
      />
    </label>
  ),
}))
vi.mock('@/hooks/useUnsavedChangesWarning', () => ({
  useUnsavedChanges: () => ({
    attemptFormClose: (callback: () => void) => callback(),
    unblockTransition: vi.fn(),
    blockTransition: vi.fn(),
  }),
}))
vi.mock('@/hooks/useVueRouter', () => ({ useVueRouter: () => ({ push: vi.fn() }) }))
// The shared collection navigation pulls in the application router; pages are tested without it.
vi.mock('@/components/SidebarNavigation', () => ({ default: () => null }))
vi.mock('@/utils/utils', () => ({
  cn: () => '',
  // The real labels, as the details overview shows them.
  getSharedValue: (isGlobal?: boolean, shared?: boolean) => {
    if (isGlobal) return 'Marketplace'
    return shared ? 'Shared with project' : 'Not shared with project'
  },
}))
// The mock store remains stable; React-owned state and real effects are exercised.
vi.mock('valtio', () => ({ useSnapshot: (store: any) => store, proxy: (value: any) => value }))
