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

import { type FC } from 'react'

import Popup from '@/components/Popup'
import Spinner from '@/components/Spinner'
import { truncateInput } from '@/utils/helpers'

import SessionBody from './SessionBody'
import { useCliAnalyticsSession } from '../hooks/useCliAnalyticsSession'

interface SessionModalProps {
  traceId: string
  onHide: () => void
}

const SessionModal: FC<SessionModalProps> = ({ traceId, onHide }) => {
  const { session, loading, error } = useCliAnalyticsSession(traceId)

  const title = truncateInput(session?.prompt, 80, 'Session')
  const subtitle = [
    'Claude-Code',
    session?.model_name,
    session?.repository,
    session?.branch,
    session?.delivery_framework,
  ]
    .filter(Boolean)
    .join(' · ')

  return (
    <Popup
      visible={true}
      onHide={onHide}
      hideFooter
      // isFullWidth gives w-full max-w-[90vw] xl:max-w-6xl. The arbitrary
      // max-w-[90vw] lives inside Popup.tsx, not here — acceptable per
      // styling-guide exception for the Popup primitive.
      isFullWidth
      headerContent={
        <div className="flex flex-col gap-0.5 min-w-0">
          <span className="text-base font-semibold text-text-primary truncate">{title}</span>
          {subtitle && <span className="text-xs text-text-secondary truncate">{subtitle}</span>}
        </div>
      }
    >
      {loading && (
        <div className="flex justify-center items-center py-16">
          <Spinner />
        </div>
      )}
      {error && !loading && <p className="text-sm py-8 text-center text-text-failed">{error}</p>}
      {!loading && !error && !session && (
        <p className="text-sm py-8 text-center text-text-secondary">No data for this session.</p>
      )}
      {session && !loading && !error && <SessionBody session={session} />}
    </Popup>
  )
}

export default SessionModal
