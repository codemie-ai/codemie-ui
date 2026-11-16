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

import { FC } from 'react'

export const MODEL_CHIP_CLASS =
  'text-xs border border-border-structural rounded-full px-2 py-0.5 text-text-quaternary whitespace-nowrap'

interface ModelCapabilityChipsProps {
  multimodal?: boolean
  supportsTools?: boolean
  supportsImageGeneration?: boolean
}

const ModelCapabilityChips: FC<ModelCapabilityChipsProps> = ({
  multimodal,
  supportsTools,
  supportsImageGeneration,
}) => {
  if (!multimodal && !supportsTools && !supportsImageGeneration) {
    return <span className="text-text-quaternary">—</span>
  }

  return (
    <span className="flex gap-1 flex-wrap">
      {multimodal && <span className={MODEL_CHIP_CLASS}>multimodal</span>}
      {supportsTools && <span className={MODEL_CHIP_CLASS}>tools</span>}
      {supportsImageGeneration && <span className={MODEL_CHIP_CLASS}>image gen</span>}
    </span>
  )
}

export default ModelCapabilityChips
