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

import { Component, ErrorInfo, ReactNode } from 'react'

/**
 * Centralized text-only degradation for A2UI surfaces.
 *
 * An unknown component or a malformed surface must never break the
 * conversation: it renders as a quiet placeholder with no interactive
 * controls and no network activity.
 */
export const A2uiFallback: React.FC<{ componentType?: string }> = ({ componentType }) => (
  <div
    data-testid="a2ui-fallback"
    className="text-sm text-text-tertiary italic py-1"
    role="note"
  >
    {componentType
      ? `This interactive element ("${componentType}") is not supported and cannot be displayed.`
      : 'This interactive element could not be displayed.'}
  </div>
)

/**
 * Consent gate rendered in place of an agent-authored media element until the
 * user asks for it.
 *
 * Agent-authored content is untrusted (prompt injection): a media URL is a
 * request the browser would make on the user's behalf, from the user's IP, with
 * whatever the agent chose to encode in the URL. Loading it automatically turns
 * every rendered surface into a zero-click side channel, so the host is shown
 * and the request is deferred until the user clicks.
 */
export const A2uiMediaConsent: React.FC<{
  label: string
  host: string
  onReveal: () => void
}> = ({ label, host, onReveal }) => (
  <div
    data-testid="a2ui-media-consent"
    className="flex flex-col items-start gap-1 rounded-lg border border-border-primary bg-surface-base-secondary px-4 py-3"
  >
    <button
      type="button"
      onClick={onReveal}
      className="text-sm text-text-primary underline underline-offset-2 hover:text-text-secondary transition"
    >
      {`Load ${label.toLowerCase()}`}
    </button>
    <span className="text-xs text-text-tertiary break-all">
      {host ? `from ${host}` : 'from an external source'}
    </span>
  </div>
)

/**
 * Placeholder rendered instead of a media element whose URL failed
 * sanitization. Fires no network request.
 */
export const A2uiMediaPlaceholder: React.FC<{ label?: string }> = ({ label }) => (
  <div
    data-testid="a2ui-media-placeholder"
    className="flex items-center justify-center rounded-lg border border-border-primary bg-surface-base-secondary text-xs text-text-tertiary px-4 py-6"
    role="note"
  >
    {label ? `${label} unavailable` : 'Media unavailable'}
  </div>
)

interface Props {
  children: ReactNode
  /**
   * Identity of the content being rendered (the surface envelopes). A caught
   * error is cleared whenever it changes: a surface caught mid-stream renders
   * from an incomplete, transient envelope set, and without a reset the boundary
   * would stay latched on that intermediate state for the rest of the session.
   */
  resetKey?: string
}

interface State {
  hasError: boolean
}

/**
 * Safety net around the agent-authored A2UI surface: a malformed payload that
 * slips past the renderer guards must degrade to a small notice rather than
 * crash the whole chat message.
 */
export class A2uiErrorBoundary extends Component<Props, State> {
  state: State = { hasError: false }

  static getDerivedStateFromError(): State {
    return { hasError: true }
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    // eslint-disable-next-line no-console
    console.error('[A2UI] failed to render surface', error, info)
  }

  componentDidUpdate(prevProps: Props) {
    if (this.state.hasError && prevProps.resetKey !== this.props.resetKey) {
      this.setState({ hasError: false })
    }
  }

  render() {
    if (this.state.hasError) {
      return (
        <div
          className="mt-4 rounded-xl border border-border-primary/40 px-4 py-3 text-sm text-text-secondary"
          data-testid="a2ui-surface-error"
        >
          This interactive block could not be displayed.
        </div>
      )
    }
    return this.props.children
  }
}

