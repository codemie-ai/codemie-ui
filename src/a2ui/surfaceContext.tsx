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


import { createContext, useContext } from 'react'

/**
 * What a component needs to know about the surface it is drawn in, and cannot read from
 * its own props.
 *
 * Both facts are surface-wide and arrive from the chat block: which Buttons are Modal
 * triggers, and which action this surface was already answered with. They live together
 * because they are the same kind of thing — a small amount of context the catalog's own
 * components have no way to carry.
 */

/**
 * The ids this surface uses as `Modal.trigger`.
 *
 * A trigger is an ordinary Button, and the catalog requires an `action` on every Button —
 * one it must not dispatch, since that submits the surface and ends the turn before the
 * dialog is seen. Suppressing the dispatch is the whole fix: the catalog's Modal wraps its
 * trigger in an element that opens on click, so the click still lands. A set of ids rather
 * than a callback, because the decision is per component from the whole surface.
 */
const A2uiModalTriggerContext = createContext<ReadonlySet<string>>(new Set())

export const A2uiModalTriggerProvider = A2uiModalTriggerContext.Provider

/** True when this component is some Modal's trigger and must not dispatch its action. */
export const useIsModalTrigger = (componentId: string | undefined): boolean => {
  const triggers = useContext(A2uiModalTriggerContext)
  return Boolean(componentId && triggers.has(componentId))
}

/** The action a user already submitted from a surface (empty for a live surface). */
export interface A2uiSubmittedAction {
  /** Dispatched action name, used to identify the control in tests. */
  name: string
  /** Id of the component that dispatched it, when the answer recorded one. */
  componentId?: string
}

/**
 * Chat-level answer state handed to the renderer components: an answered
 * surface renders read-only, and the control that produced the answer marks
 * itself so the user can see which option was chosen. Kept as context because
 * the A2UI binder owns the component tree between the chat block and the leaf
 * renderers.
 */
const A2uiSubmittedActionContext = createContext<A2uiSubmittedAction | null>(null)

export const A2uiSubmittedActionProvider = A2uiSubmittedActionContext.Provider

export const useA2uiSubmittedAction = (): A2uiSubmittedAction | null =>
  useContext(A2uiSubmittedActionContext)