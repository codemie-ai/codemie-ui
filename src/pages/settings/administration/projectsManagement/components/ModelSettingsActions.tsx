// Copyright 2026 EPAM Systems, Inc. ("EPAM")
// Licensed under the Apache License, Version 2.0

import { FC } from 'react'

import Button from '@/components/Button'
import { ButtonSize, ButtonType } from '@/constants'

interface ModelSettingsActionsProps {
  resetLabel: string
  onReset: () => void
  resetDisabled: boolean
  onApply: () => void
  /** True when there is nothing to apply; the invalid-default and busy rules are added here. */
  applyDisabled: boolean
  defaultIsValid: boolean
  busy: boolean
  /** Adds a Cancel button and pushes Reset to the far left, as in a dialog footer. */
  onCancel?: () => void
}

const ModelSettingsActions: FC<ModelSettingsActionsProps> = ({
  resetLabel,
  onReset,
  resetDisabled,
  onApply,
  applyDisabled,
  defaultIsValid,
  busy,
  onCancel,
}) => (
  <>
    <Button
      size={ButtonSize.MEDIUM}
      variant={ButtonType.SECONDARY}
      onClick={onReset}
      disabled={resetDisabled || busy}
      className={onCancel ? 'mr-auto' : undefined}
    >
      {resetLabel}
    </Button>
    {onCancel && (
      <Button
        size={ButtonSize.MEDIUM}
        variant={ButtonType.SECONDARY}
        onClick={onCancel}
        disabled={busy}
      >
        Cancel
      </Button>
    )}
    <Button
      size={ButtonSize.MEDIUM}
      variant={ButtonType.PRIMARY}
      onClick={onApply}
      disabled={applyDisabled || !defaultIsValid || busy}
    >
      Apply changes
    </Button>
  </>
)

export default ModelSettingsActions
