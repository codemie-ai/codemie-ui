// Copyright 2026 EPAM Systems, Inc. ("EPAM")
// Licensed under the Apache License, Version 2.0

import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'

import BudgetOverrideIndicator from '../BudgetOverrideIndicator'

describe('BudgetOverrideIndicator', () => {
  it('shows an explicit override badge with an explanatory tooltip', () => {
    render(<BudgetOverrideIndicator />)

    const badge = screen.getByText('Overridden')
    expect(badge.closest('[data-tooltip-id="react-tooltip"]')).toHaveAttribute(
      'data-tooltip-content',
      'Custom limit for this user'
    )
  })
})
