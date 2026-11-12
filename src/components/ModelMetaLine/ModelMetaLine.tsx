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

import { FC } from 'react'

export const CLI_ONLY_MODEL_TOOLTIP =
  'CLI only — not available in web chat; usable through CodeMie CLI and the apps it connects'

interface ModelMetaLineProps {
  isRouter?: boolean
  isPremium?: boolean
  /** Hidden from web chat (forbidden_for_web); offered only through CodeMie CLI and its connectors. */
  cliOnly?: boolean
  className?: string
  testId?: string
}

/**
 * The second line under a model name: "Router" in blue, "Premium" in amber, "CLI only" in grey,
 * joined with " · ". The same line in every model list, so a router, a premium model and a
 * CLI-only one read the same way in pickers, the project model table and the help catalog.
 * Pass isPremium only where premium has no badge of its own. Renders nothing when no flag is set.
 */
const ModelMetaLine: FC<ModelMetaLineProps> = ({
  isRouter = false,
  isPremium = false,
  cliOnly = false,
  className = '',
  testId = 'model-meta-line',
}) => {
  const parts = [
    isRouter && (
      <span key="router" className="text-in-progress-primary">
        Router
      </span>
    ),
    isPremium && (
      <span key="premium" className="text-aborted-primary">
        Premium
      </span>
    ),
    cliOnly && (
      <span
        key="cli-only"
        className="text-text-quaternary"
        data-tooltip-id="react-tooltip"
        data-tooltip-content={CLI_ONLY_MODEL_TOOLTIP}
      >
        CLI only
      </span>
    ),
  ].filter(Boolean)

  if (parts.length === 0) return null

  return (
    <span
      data-testid={testId}
      className={`truncate text-xs text-text-tertiary ${className}`.trim()}
    >
      {parts.flatMap((part, index) => (index === 0 ? [part] : [' · ', part]))}
    </span>
  )
}

export default ModelMetaLine
