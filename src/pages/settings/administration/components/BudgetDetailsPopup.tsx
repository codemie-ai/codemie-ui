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

import { FC, ReactNode } from 'react'

import Popup from '@/components/Popup'
import { Budget, getBudgetCategoryLabel, getBudgetCreatorDisplay } from '@/types/entity/budget'
import { formatCurrency } from '@/utils/currency'
import { formatDateTime } from '@/utils/helpers'
import { displayValue } from '@/utils/utils'

interface BudgetDetailsPopupProps {
  budget: Budget | null
  onHide: () => void
}

const DetailRow: FC<{ label: string; children: ReactNode }> = ({ label, children }) => (
  <div>
    <div className="text-xs text-text-quaternary mb-1">{label}</div>
    <div className="text-sm text-text-primary break-words">{children}</div>
  </div>
)

const BudgetDetailsPopup: FC<BudgetDetailsPopupProps> = ({ budget, onHide }) => {
  return (
    <Popup visible={!!budget} onHide={onHide} header="Budget details" hideFooter limitWidth>
      {budget && (
        <div className="flex flex-col gap-4 pb-4">
          <DetailRow label="Budget ID">
            <span className="font-mono">{budget.budget_id}</span>
          </DetailRow>
          <DetailRow label="Name">{budget.name}</DetailRow>
          <DetailRow label="Description">{displayValue(budget.description)}</DetailRow>
          <DetailRow label="Category">{getBudgetCategoryLabel(budget.budget_category)}</DetailRow>
          <DetailRow label="Limits">
            {formatCurrency(budget.max_budget)} (soft {formatCurrency(budget.soft_budget)})
          </DetailRow>
          <DetailRow label="Duration">{budget.budget_duration}</DetailRow>
          <DetailRow label="Reset">
            {displayValue(formatDateTime(budget.budget_reset_at))}
          </DetailRow>
          <DetailRow label="Created by">{getBudgetCreatorDisplay(budget)}</DetailRow>
          <DetailRow label="Updated">
            {displayValue(formatDateTime(budget.updated_at || budget.created_at))}
          </DetailRow>
        </div>
      )}
    </Popup>
  )
}

export default BudgetDetailsPopup
