// Copyright 2026 EPAM Systems, Inc. ("EPAM")
// Licensed under the Apache License, Version 2.0

import { FC } from 'react'

import DetailsBadge from '@/components/details/DetailsBadge'

const BudgetOverrideIndicator: FC = () => (
  <span
    data-tooltip-id="react-tooltip"
    data-tooltip-content="Custom limit for this user"
    className="ml-1 inline-flex align-middle"
  >
    <DetailsBadge
      value="Overridden"
      className="!h-[17px] !rounded-md !px-1.5 !py-0 text-[10px] !font-medium text-text-secondary"
    />
  </span>
)

export default BudgetOverrideIndicator
