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

import { FC, useEffect, useState } from 'react'

import Popup from '@/components/Popup'
import { BudgetAssignment } from '@/types/entity/budget'

import BudgetAssignmentsEditor from './BudgetAssignmentsEditor'

interface BudgetAssignmentsModalProps {
  visible: boolean
  header: string
  initialAssignments?: BudgetAssignment[]
  onHide: () => void
  onSubmit: (assignments: BudgetAssignment[]) => Promise<void>
}

const BudgetAssignmentsModal: FC<BudgetAssignmentsModalProps> = ({
  visible,
  header,
  initialAssignments = [],
  onHide,
  onSubmit,
}) => {
  const [assignments, setAssignments] = useState<BudgetAssignment[]>(initialAssignments)
  const [isSubmitting, setIsSubmitting] = useState(false)

  useEffect(() => {
    if (visible) {
      setAssignments(initialAssignments)
    }
    // intentionally omitting initialAssignments — we only want to reset when the modal opens,
    // not every time the parent re-renders (which would create a new [] reference each time)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [visible])

  const handleSubmit = async () => {
    setIsSubmitting(true)
    try {
      await onSubmit(assignments)
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <Popup
      visible={visible}
      onHide={onHide}
      header={header}
      onSubmit={handleSubmit}
      submitText="Save"
      submitDisabled={isSubmitting}
      cancelText="Cancel"
      className="w-full max-w-2xl"
      withBorderBottom={false}
    >
      <BudgetAssignmentsEditor value={assignments} onChange={setAssignments} />
    </Popup>
  )
}

export default BudgetAssignmentsModal
