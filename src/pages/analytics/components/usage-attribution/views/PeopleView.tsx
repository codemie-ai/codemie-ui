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

import { FC, useState } from 'react'

import type { UaPeopleGroupBy } from '@/types/usageAttribution'

import PeopleGroupModal from '../modals/PeopleGroupModal'
import PersonModal from '../modals/PersonModal'
import PeopleTable from '../tables/PeopleTable'

interface Props {
  params: Record<string, string | number>
  periodQuery: Record<string, string>
}

type OpenGroup = { groupBy: Exclude<UaPeopleGroupBy, 'none'>; id: string }

const PeopleView: FC<Props> = ({ params, periodQuery }) => {
  const [uid, setUid] = useState<string | null>(null)
  const [group, setGroup] = useState<OpenGroup | null>(null)
  return (
    <div className="flex flex-col gap-6">
      <PeopleTable
        params={params}
        onOpen={setUid}
        onOpenGroup={(groupBy, id) => setGroup({ groupBy, id })}
      />
      {group && (
        <PeopleGroupModal
          groupBy={group.groupBy}
          groupId={group.id}
          params={params}
          onHide={() => setGroup(null)}
          onOpenPerson={(next) => {
            setGroup(null)
            setUid(next)
          }}
        />
      )}
      {uid && (
        <PersonModal
          uid={uid}
          params={params}
          periodQuery={periodQuery}
          onHide={() => setUid(null)}
          onOpenGroup={(id) => {
            setUid(null)
            setGroup({ groupBy: 'common', id })
          }}
        />
      )}
    </div>
  )
}

export default PeopleView
