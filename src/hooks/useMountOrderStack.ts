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

import { useSyncExternalStore } from 'react'

/**
 * A registry of entries ordered by the moment each one registered. The last registration wins,
 * which for stacked overlays is the one the user is currently in.
 *
 * This is the same "who is on top" mechanism `AnnouncerHostContext` implements for live-region
 * hosts, minus the provider. `Popup` is rendered by 117 call sites and by ~20 test suites with no
 * app-level providers above it, so a context-based stack would make the stacked-dialog guard
 * depend on a provider being mounted — and silently fall back to "every dialog is topmost", which
 * is the focus-theft bug this guard exists to prevent. A module-level store keeps the guard
 * intrinsic while still driving React state through `useSyncExternalStore`.
 */
export interface MountOrderStack<T> {
  /** Registers `entry` as the topmost until the returned undo runs. */
  register: (entry: T) => () => void
  subscribe: (listener: () => void) => () => void
  /** The most recently registered entry, or `null` when nothing is registered. */
  getTopmost: () => T | null
}

export const createMountOrderStack = <T>(): MountOrderStack<T> => {
  let stack: T[] = []
  const listeners = new Set<() => void>()

  const emit = () => listeners.forEach((listener) => listener())

  return {
    register: (entry) => {
      stack = [...stack, entry]
      emit()

      return () => {
        stack = stack.filter((registered) => registered !== entry)
        emit()
      }
    },
    subscribe: (listener) => {
      listeners.add(listener)

      return () => {
        listeners.delete(listener)
      }
    },
    // Returns the entry itself rather than a derived object, so the snapshot is referentially
    // stable between emits and useSyncExternalStore does not loop.
    getTopmost: () => stack[stack.length - 1] ?? null,
  }
}

/** Subscribes to `stack` and re-renders the caller whenever the topmost entry changes. */
export const useTopmostEntry = <T>(stack: MountOrderStack<T>): T | null =>
  useSyncExternalStore(stack.subscribe, stack.getTopmost, stack.getTopmost)
