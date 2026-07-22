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

interface Props {
  children: ReactNode
}

interface State {
  hasError: boolean
}

/**
 * Safety net around the agent-authored interactive surface: a malformed payload
 * that slips past the array guards must degrade to a small notice rather than
 * crash the whole chat message.
 */
class InteractiveErrorBoundary extends Component<Props, State> {
  state: State = { hasError: false }

  static getDerivedStateFromError(): State {
    return { hasError: true }
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    // eslint-disable-next-line no-console
    console.error('[InteractiveElements] failed to render surface', error, info)
  }

  render() {
    if (this.state.hasError) {
      return (
        <div
          className="mt-4 rounded-xl border border-border-primary/40 px-4 py-3 text-sm text-text-secondary"
          data-testid="interactive-surface-error"
        >
          This interactive block could not be displayed.
        </div>
      )
    }
    return this.props.children
  }
}

export default InteractiveErrorBoundary
