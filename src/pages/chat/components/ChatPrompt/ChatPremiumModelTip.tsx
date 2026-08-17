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
import { Link } from 'react-router'

import CrossSvg from '@/assets/icons/cross.svg?react'
import InfoSvg from '@/assets/icons/info.svg?react'
import { HELP_MODELS_ROUTE } from '@/pages/help/ModelsCatalog'

interface ChatPremiumModelTipProps {
  modelLabel: string
  onDismiss: () => void
}

// Styled after InfoWarning (WARNING type) but with a link to the models catalog.
const ChatPremiumModelTip: FC<ChatPremiumModelTipProps> = ({ modelLabel, onDismiss }) => (
  <div className="relative w-full max-w-5xl mx-auto">
    <div className="flex p-2 rounded-md border text-xs bg-aborted-primary/20 border-aborted-primary pr-8">
      <div className="flex items-center">
        <InfoSvg className="min-w-[18px] min-h-[18px] mr-2" />
        <div className="flex-row">
          <div className="pb-2 mt-0.5">Premium model active</div>
          <div>
            {modelLabel} · higher usage rates apply to this conversation ·{' '}
            <Link
              to={HELP_MODELS_ROUTE}
              className="text-aborted-primary hover:text-aborted-primary/80 underline transition-colors"
            >
              View models and rates
            </Link>
          </div>
        </div>
      </div>
    </div>
    <button
      type="button"
      aria-label="Dismiss premium model tip"
      onClick={onDismiss}
      className="absolute right-2 top-1/2 -translate-y-1/2 text-text-quaternary hover:text-text-primary transition-colors"
    >
      <CrossSvg className="w-3.5 h-3.5" />
    </button>
  </div>
)

export default ChatPremiumModelTip
