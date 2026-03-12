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

import CopySvg from '@/assets/icons/copy.svg?react'
import Button from '@/components/Button'
import { copyToClipboard } from '@/utils/utils'

interface SystemInstructionsProps {
  text: string
}

const SystemInstructions = ({ text }: SystemInstructionsProps) => {
  return (
    <div className="flex flex-col bg-surface-base-secondary border border-border-specific-panel-outline rounded-lg overflow-hidden">
      <div className="flex justify-between items-center px-4 py-2 bg-white/5">
        <p className="text-xs">System Instructions</p>
        <Button
          variant="secondary"
          onClick={() => copyToClipboard(text, 'Instructions copied to clipboard')}
        >
          <CopySvg />
          Copy
        </Button>
      </div>
      <p className="text-sm p-4 whitespace-pre-wrap w-full">{text}</p>
    </div>
  )
}

export default SystemInstructions
