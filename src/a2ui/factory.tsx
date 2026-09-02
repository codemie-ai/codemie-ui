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

import React from 'react'

import { checkConditions, failingCheckMessage } from './checks'
import { createComponentImplementation } from './config'
import { A2uiMediaConsent, A2uiMediaPlaceholder } from './fallback'
import { agentUrlHost, sanitizeAgentUrl } from './utils'

import type {
  ComponentApi,
  ComponentContext,
  DataContext,
  ReactComponentImplementation,
} from './config'

/**
 * Group factories over the SDK's `createComponentImplementation` (re-exported
 * by `./config`, which owns the versioned entry points).
 *
 * The A2UI generic binder resolves every wire prop (data bindings, function
 * calls, actions) before our render components see it, and injects `set<Prop>`
 * setters plus `isValid`/`validationErrors`. These factories normalize that
 * resolved shape into three stable in-house contracts — input, layout, media —
 * so the registry stays declarative (roughly one row per catalog component).
 */

/** Props of a component as resolved by the A2UI generic binder. */
export type ResolvedProps = Record<string, unknown>

/** Renders a child component of the surface by id (with an optional data base path). */
export type BuildChild = (id: string, basePath?: string) => React.ReactNode

/**
 * The render contract `createComponentImplementation` invokes wrappers with.
 *
 * Declared as a type rather than an interface on purpose: as an interface React's lint
 * reads it as a propTypes declaration and reports `buildChild` and `context` as props that
 * are declared and never used — they are not this wrapper's to use, they are forwarded
 * whole to the renderer underneath.
 */
export type A2uiRenderProps = {
  props: ResolvedProps
  buildChild?: BuildChild
  context?: ComponentContext
}

/**
 * What a LEAF renderer consumes: one control, drawn from its resolved props.
 *
 * Narrower than the full contract on purpose. An input or a media element builds no
 * children and reads nothing off the context, and declaring props it never touches is both
 * misleading to the reader and reported as dead by React's lint.
 */
export type A2uiLeafRenderProps = Pick<A2uiRenderProps, 'props'>

/** ARIA attributes for the catalog's `accessibility: {label, description}`. */
export interface AriaAttributes {
  'aria-label'?: string
  'aria-description'?: string
}

/**
 * Reads the catalog's universal `accessibility` property into ARIA attributes.
 *
 * Every catalog component accepts it, so it is resolved here rather than in each
 * renderer: a property the backend advertises to the model and no renderer honours is
 * exactly the drift the BE/FE manifest contract exists to prevent.
 */
export function ariaAttributes(props: ResolvedProps | undefined): AriaAttributes {
  const accessibility = props?.accessibility
  if (!accessibility || typeof accessibility !== 'object') return {}
  const { label, description } = accessibility as { label?: unknown; description?: unknown }
  return {
    ...(typeof label === 'string' && label ? { 'aria-label': label } : {}),
    ...(typeof description === 'string' && description ? { 'aria-description': description } : {}),
  }
}

/**
 * Applies the catalog's universal `weight` — "similar to the CSS 'flex-grow' property"
 * and only meaningful directly inside a Row or Column, which is where the wrapper lands.
 *
 * Only wraps when a weight is actually declared, so surfaces that do not use it render
 * byte-identical markup to before.
 */
function withWeight(node: React.ReactNode, props: ResolvedProps | undefined): React.ReactNode {
  const weight = props?.weight
  if (typeof weight !== 'number' || !Number.isFinite(weight)) return node
  return <div style={{ flexGrow: weight, flexBasis: 0, minWidth: 0 }}>{node}</div>
}

/**
 * The labelled grouping element, as a `fieldset` rather than a div with `role="group"`.
 *
 * The catalog's `accessibility` label belongs to the component as a whole, and a wrapper is
 * the only place to put it — but a wrapper needs a role for the label to be announced at
 * all. `fieldset` carries that grouping semantics natively, which reads correctly on every
 * device rather than only where the ARIA role is honoured. Its default border, margin and
 * intrinsic minimum width are cleared so the surface looks exactly as before.
 */
const A2uiGroup: React.FC<AriaAttributes & { children: React.ReactNode }> = ({ children, ...aria }) => (
  <fieldset style={{ border: 0, margin: 0, padding: 0, minInlineSize: 0 }} {...aria}>
    {children}
  </fieldset>
)

interface ImplementOptions {
  /** Set when the renderer puts the ARIA attributes on its own control instead. */
  ownsAccessibility?: boolean
}

/** One controlled boundary between our loosely-typed wrappers and the SDK generics. */
function implement(
  api: ComponentApi,
  Render: React.FC<A2uiRenderProps>,
  { ownsAccessibility = false }: ImplementOptions = {}
): ReactComponentImplementation {
  const WithCommonProps: React.FC<A2uiRenderProps> = (renderProps) => {
    const resolved = renderProps.props
    const node = <Render {...renderProps} />
    // A non-interactive wrapper needs a role for `aria-label` to be announced at all;
    // inputs label their own control, which screen readers convey far better.
    const aria = ownsAccessibility ? {} : ariaAttributes(resolved)
    const labelled = Object.keys(aria).length ? <A2uiGroup {...aria}>{node}</A2uiGroup> : node
    return <>{withWeight(labelled, resolved)}</>
  }
  WithCommonProps.displayName = `A2uiCommon(${Render.displayName ?? Render.name ?? 'Anonymous'})`
  return createComponentImplementation(
    api,
    WithCommonProps as Parameters<typeof createComponentImplementation>[1]
  )
}

/**
 * Adds `accessibility` to an implementation we did not build.
 *
 * The SDK's own catalog components do not read that property — it is advertised to the
 * model and would otherwise be silently ignored, which is the drift the BE/FE contract
 * exists to prevent. Applied from the outside, the only reachable source of the
 * component's declared properties is its model on the context, and the only place to put
 * the label is a wrapper; a wrapper needs a role for `aria-label` to be announced at all.
 */
export function withAccessibility(impl: ReactComponentImplementation): ReactComponentImplementation {
  const Inner = impl.render
  const Wrapped: typeof Inner = (renderProps) => {
    const model = renderProps.context?.componentModel as { properties?: ResolvedProps } | undefined
    const aria = ariaAttributes(model?.properties)
    const node = <Inner {...renderProps} />
    if (!Object.keys(aria).length) return node
    return <A2uiGroup {...aria}>{node}</A2uiGroup>
  }
  Wrapped.displayName = `A2uiAccessible(${impl.name ?? 'Component'})`
  return { ...impl, render: Wrapped }
}

/**
 * Renders the message a failed `check` produced, for SDK components that swallow it.
 *
 * The SDK's own TextField and CheckBox print `validationErrors[0]`; its ChoicePicker and
 * Slider read the prop and never render it. The result is a form that refuses to submit
 * and says nothing about why — the field is required, the button stays disabled, and the
 * user has no way to learn which field is at fault. Wrapping is enough: the message is
 * appended, the SDK's own markup is untouched, and components that already print their
 * error are not wrapped so nobody sees it twice.
 */
/**
 * The message for the check this component currently fails, kept current.
 *
 * A check's answer is a function of the data model, so the message has to be recomputed
 * when the model changes — subscribing is what makes it disappear the moment the user
 * fills the field in. Without it the wrapper renders once and the inner SDK component
 * updates alone, leaving a message on screen for a field that is now valid.
 */
function useFailingCheckMessage(
  dataContext: DataContext | undefined,
  properties: ResolvedProps | undefined
): string | undefined {
  const [, onDataChanged] = React.useReducer((tick: number) => tick + 1, 0)
  // Memoized on the component's own properties, which are stable for its lifetime: without
  // this the array is new on every render and the effect would resubscribe on each one.
  const conditions = React.useMemo(() => checkConditions(properties), [properties])
  React.useEffect(() => {
    // A no-op cleanup rather than `return undefined`: an effect that sometimes returns a
    // function and sometimes nothing is what `consistent-return` refuses.
    const nothingToClean = () => {}
    if (!dataContext || !conditions.length) return nothingToClean
    const subscribe = (condition: unknown) => {
      try {
        return dataContext.subscribeDynamicValue(condition as never, onDataChanged)
      } catch {
        // A condition the SDK cannot bind simply never updates; it must not break render.
        return null
      }
    }
    const subscriptions = conditions.map(subscribe).filter(Boolean) as { unsubscribe?: () => void }[]
    return () => subscriptions.forEach((subscription) => subscription.unsubscribe?.())
  }, [dataContext, conditions, onDataChanged])
  return dataContext ? failingCheckMessage(dataContext, properties) : undefined
}

/**
 * Renders the message a failed `check` produced, for SDK components that swallow it.
 *
 * The SDK's own TextField and CheckBox print `validationErrors[0]`; its ChoicePicker and
 * Slider read the prop and render nothing, so a required field blocked submission and said
 * nothing about which one was at fault.
 *
 * The message is evaluated here rather than read from `validationErrors`, because a
 * wrapper placed around a catalog component is invoked with {context, buildChild} only —
 * the binder hands its resolved props to the SDK's own render, one level in. The context
 * carries the declared properties and the data context, which is all a check needs, and
 * going through the shared evaluator is what keeps this message and the disabled submit
 * button from disagreeing.
 */
export function withValidationMessage(impl: ReactComponentImplementation): ReactComponentImplementation {
  const Inner = impl.render
  const Wrapped: typeof Inner = (renderProps) => {
    const context = renderProps.context as
      | { componentModel?: { properties?: ResolvedProps }; dataContext?: DataContext }
      | undefined
    const message = useFailingCheckMessage(context?.dataContext, context?.componentModel?.properties)
    return (
      <>
        <Inner {...renderProps} />
        {message && <div className="text-sm text-failed-secondary">{message}</div>}
      </>
    )
  }
  Wrapped.displayName = `A2uiValidated(${impl.name ?? 'Component'})`
  return { ...impl, render: Wrapped }
}

/** Implementation for a component that needs no group normalization. */
export function createBasicImplementation(
  api: ComponentApi,
  Render: React.FC<A2uiRenderProps>,
  options: ImplementOptions = {}
): ReactComponentImplementation {
  return implement(api, Render, options)
}

// --------------------------------------------------------------------------
// Inputs
// --------------------------------------------------------------------------

/** Normalized contract every input renderer receives. */
export interface InputRenderProps<TValue> {
  label?: string
  value?: TValue
  setValue: (value: TValue) => void
  validationErrors: string[]
  /** ARIA attributes from `accessibility`, to spread onto the rendered control. */
  aria?: AriaAttributes
  /** Remaining resolved props (variant, options, min/max, …). */
  rest: ResolvedProps
}

const noop = () => undefined

/**
 * Wraps an input renderer so it always receives {label, value, setValue,
 * validationErrors, rest} regardless of how the binder resolved the props.
 * Exported separately from createInputImplementation for isolated testing.
 */
export function createInputRender<TValue>(
  Render: React.FC<InputRenderProps<TValue>>
): React.FC<A2uiRenderProps> {
  const InputRender: React.FC<A2uiLeafRenderProps> = ({ props }) => {
    const { label, value, setValue, validationErrors, ...rest } = props ?? {}
    return (
      <Render
        label={typeof label === 'string' ? label : undefined}
        value={value as TValue | undefined}
        setValue={typeof setValue === 'function' ? (setValue as (value: TValue) => void) : noop}
        validationErrors={Array.isArray(validationErrors) ? validationErrors.map(String) : []}
        aria={ariaAttributes(props)}
        rest={rest}
      />
    )
  }
  InputRender.displayName = `A2uiInput(${Render.displayName ?? Render.name ?? 'Anonymous'})`
  return InputRender
}

export function createInputImplementation<TValue>(
  api: ComponentApi,
  Render: React.FC<InputRenderProps<TValue>>
): ReactComponentImplementation {
  return implement(api, createInputRender(Render), { ownsAccessibility: true })
}

// --------------------------------------------------------------------------
// Media
// --------------------------------------------------------------------------

/** Normalized contract every media renderer receives. `url` is already sanitized. */
export interface MediaRenderProps {
  url: string
  /** Remaining resolved props (description, fit, variant, …). */
  rest: ResolvedProps
}

/**
 * The two guards every agent-authored media URL passes: only absolute http(s) reaches the
 * renderer, and even then the element mounts only after the user consents, with the target
 * host named. Rendering one straight away would fetch an attacker-chosen host with the
 * user's IP before they touched anything.
 */
export function createMediaRender(
  Render: React.FC<MediaRenderProps>,
  componentLabel: string
): React.FC<A2uiRenderProps> {
  const MediaRender: React.FC<A2uiLeafRenderProps> = ({ props }) => {
    const [revealed, setRevealed] = React.useState(false)
    const { url, ...rest } = props ?? {}
    const safeUrl = sanitizeAgentUrl(url)
    if (!safeUrl) return <A2uiMediaPlaceholder label={componentLabel} />
    if (!revealed) {
      return (
        <A2uiMediaConsent
          label={componentLabel}
          host={agentUrlHost(safeUrl)}
          onReveal={() => setRevealed(true)}
        />
      )
    }
    return <Render url={safeUrl} rest={rest} />
  }
  MediaRender.displayName = `A2uiMedia(${componentLabel})`
  return MediaRender
}

export function createMediaImplementation(
  api: ComponentApi,
  Render: React.FC<MediaRenderProps>
): ReactComponentImplementation {
  return implement(api, createMediaRender(Render, api.name))
}
