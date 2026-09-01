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

import { FC, ReactNode, createContext, useCallback, useContext, useMemo, useState } from 'react'

/**
 * Registry of live-region hosts, ordered by the time each one was mounted.
 *
 * A live region is only audible where assistive tech is currently listening: while a modal is open,
 * VoiceOver ignores regions outside it and Chromium drops them too (w3c/aria#1854), and any region
 * inside a subtree marked `aria-hidden="true"` — which is what modals do to `#app` — is dropped from
 * the accessibility tree altogether. So the region has to live inside the modal the user is in.
 *
 * Rather than have the announcer discover that modal from the DOM, each modal surface declares
 * itself by rendering <ModalAnnouncerHost /> while it is open. The topmost registration wins, which
 * for nested modals is the last one to mount. Unregistration follows React state, so a modal still
 * in the DOM through its leave transition no longer holds the region.
 */
type RegisterHost = (host: HTMLElement) => () => void

/** Split from the host value so a modal opening does not re-render every registrar. */
const RegisterHostContext = createContext<RegisterHost>(() => () => {})

/** `null` means no modal is open and the region belongs at `<body>`. */
const AnnouncerHostContext = createContext<HTMLElement | null>(null)

/** Registers `host` as the live-region host while the caller is mounted. Returns the undo. */
export const useRegisterAnnouncerHost = (): RegisterHost => useContext(RegisterHostContext)

/** The host the live region belongs in right now, or `null` for the `<body>` fallback. */
export const useAnnouncerHost = (): HTMLElement | null => useContext(AnnouncerHostContext)

const append = (host: HTMLElement) => (stack: HTMLElement[]) => [...stack, host]

const without = (host: HTMLElement) => (stack: HTMLElement[]) =>
  stack.filter((entry) => entry !== host)

export const AnnouncerHostProvider: FC<{ children?: ReactNode }> = ({ children }) => {
  const [stack, setStack] = useState<HTMLElement[]>([])

  const registerHost = useCallback<RegisterHost>((host) => {
    setStack(append(host))

    return () => setStack(without(host))
  }, [])

  const host = useMemo(() => stack[stack.length - 1] ?? null, [stack])

  return (
    <RegisterHostContext.Provider value={registerHost}>
      <AnnouncerHostContext.Provider value={host}>{children}</AnnouncerHostContext.Provider>
    </RegisterHostContext.Provider>
  )
}
