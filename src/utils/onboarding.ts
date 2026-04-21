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

import { ElementPosition } from '@/types/onboarding'

export const getElementPosition = (
  target: string | (() => HTMLElement | null)
): ElementPosition | null => {
  const element = typeof target === 'string' ? document.querySelector(target) : target()

  if (!element) return null

  const rect = element.getBoundingClientRect()
  return {
    top: rect.top,
    left: rect.left,
    width: rect.width,
    height: rect.height,
  }
}

export const scrollToElement = (element: HTMLElement) => {
  element.scrollIntoView({
    behavior: 'smooth',
    block: 'center',
    inline: 'center',
  })
}

export const getTargetElement = (
  target?: string | (() => HTMLElement | null)
): HTMLElement | null => {
  if (!target) return null

  if (typeof target === 'string') {
    return document.querySelector(target)
  }

  return target()
}

/**
 * Finds a navigation link element by its visible text content.
 * Searches within the main header nav and top-level header anchors.
 */
export const findNavLinkByText = (text: string): HTMLElement | null => {
  const links = Array.from(document.querySelectorAll('header nav a, header a'))
  return (links.find((link) => link.textContent?.trim().includes(text)) as HTMLElement) || null
}

/**
 * Returns the element marked with a given data-onboarding attribute.
 * Use this as a Highlight step target: `target: () => findOnboardingElement('my-id')`
 */
export const findOnboardingElement = (id: string): HTMLElement | null =>
  document.querySelector(`[data-onboarding="${id}"]`)

/**
 * Returns true when the accordion inside a [data-onboarding] wrapper is expanded.
 * Relies on the Tailwind class `grid-rows-[1fr]` that our Accordion component applies.
 */
export const isAccordionExpanded = (onboardingId: string): boolean => {
  const wrapper = findOnboardingElement(onboardingId)
  const grid = wrapper?.querySelector('.grid')
  return !!grid && Array.from(grid.classList).some((c) => c.includes('[1fr]'))
}

/**
 * Expands the accordion inside a [data-onboarding] wrapper if it is currently collapsed.
 * Clicks the PrimeReact AccordionTab header action (`<a>` element).
 */
export const expandAccordion = (onboardingId: string): void => {
  if (isAccordionExpanded(onboardingId)) return
  const toggle = findOnboardingElement(onboardingId)?.querySelector('a') as HTMLElement | null
  toggle?.click()
}

/**
 * Collapses the accordion inside a [data-onboarding] wrapper if it is currently expanded.
 */
export const collapseAccordion = (onboardingId: string): void => {
  if (!isAccordionExpanded(onboardingId)) return
  const toggle = findOnboardingElement(onboardingId)?.querySelector('a') as HTMLElement | null
  toggle?.click()
}

// ---------------------------------------------------------------------------
// Data source form — type switcher bridge
// Allows onboarding flow steps to set the indexType field without touching the DOM.
// ---------------------------------------------------------------------------

let _setIndexTypeCallback: ((type: string) => void) | null = null

/**
 * Called by onboarding flow steps to switch the data source type selector.
 * No-ops if the form is not currently mounted.
 */
export const setIndexType = (type: string): void => {
  _setIndexTypeCallback?.(type)
}

/**
 * Called by DataSourceForm on mount to register its setValue handler.
 * Returns a cleanup function that unregisters the callback.
 */
export const registerIndexTypeCallback = (cb: (type: string) => void): (() => void) => {
  _setIndexTypeCallback = cb
  return () => {
    if (_setIndexTypeCallback === cb) _setIndexTypeCallback = null
  }
}

// ---------------------------------------------------------------------------
// Integration form — credential type switcher bridge
// Allows onboarding flow steps to set the credentialType field without touching the DOM.
// ---------------------------------------------------------------------------

let _setCredentialTypeCallback: ((type: string) => void) | null = null

/**
 * Called by onboarding flow steps to switch the integration credential type selector.
 * No-ops if the form is not currently mounted.
 */
export const setCredentialType = (type: string): void => {
  _setCredentialTypeCallback?.(type)
}

/**
 * Called by SettingsForm on mount to register its credential type change handler.
 * Returns a cleanup function that unregisters the callback.
 */
export const registerCredentialTypeCallback = (cb: (type: string) => void): (() => void) => {
  _setCredentialTypeCallback = cb
  return () => {
    if (_setCredentialTypeCallback === cb) _setCredentialTypeCallback = null
  }
}
