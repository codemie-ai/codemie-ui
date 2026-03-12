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

import { SplitButton } from 'primereact/splitbutton'
import React, { useMemo, useRef } from 'react'

import IconChevronDown from '@/assets/icons/chevron-down.svg?react'
import Button from '@/components/Button/Button'

import makePtDropdownButton from './ptPreset'

import type { MenuItem } from 'primereact/menuitem'

type DropdownItem = {
  label: string
  onClick: () => void
}

type Props = {
  label: string
  iconLeft?: React.ReactNode
  items?: DropdownItem[]
  className?: string
  size?: 'medium' | 'large'
  disabled?: boolean
}

const DropdownButton: React.FC<Props> = ({
  label,
  iconLeft,
  items = [],
  className,
  size = 'large',
  disabled = false,
}) => {
  const splitBtnRef = useRef<null | SplitButton>(null)
  const menuItems: MenuItem[] = items.map((item) => ({
    label: item.label,
    command: item.onClick,
  }))
  const pt = useMemo<ReturnType<typeof makePtDropdownButton>>(
    () => makePtDropdownButton(size, disabled, className),
    [size, disabled, className]
  )

  if (items.length <= 1) {
    return (
      <Button onClick={items[0]?.onClick} disabled={disabled}>
        {iconLeft && <span>{iconLeft}</span>}
        {label}
      </Button>
    )
  }

  return (
    <SplitButton
      pt={pt}
      label={label}
      icon={iconLeft}
      ref={splitBtnRef}
      model={menuItems}
      disabled={disabled}
      dropdownIcon={<IconChevronDown />}
      menuClassName="splitbutton-menu-content"
      className="bg-surface-base-float hover:bg-button-primary-hover text-text-accent !border-transparent"
      onClick={(e) =>
        (splitBtnRef.current as { show(e: React.MouseEvent<HTMLElement, MouseEvent>): void })?.show(
          e
        )
      }
    />
  )
}

export default DropdownButton
