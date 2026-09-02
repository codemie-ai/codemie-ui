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

import { Dropdown, DropdownChangeEvent } from 'primereact/dropdown'
import { FC, FocusEvent } from 'react'

import CheckSvg from '@/assets/icons/check.svg?react'
import ChevronDownSvg from '@/assets/icons/chevron-down.svg?react'
import FingerprintSvg from '@/assets/icons/fingerprint.svg?react'
import ProtectSvg from '@/assets/icons/protect.svg?react'
import { cn } from '@/utils/utils'

export enum ToolCallPolicy {
  ASK_FOR_APPROVAL = 'ask_for_approval',
  AUTO_APPROVE = 'auto_approve',
  APPROVE_FOR_ME = 'approve_for_me',
}

interface PolicyOption {
  value: ToolCallPolicy
  label: string
  subtitle: string
  Icon: FC<{ className?: string }>
}

const POLICY_OPTIONS: PolicyOption[] = [
  {
    value: ToolCallPolicy.ASK_FOR_APPROVAL,
    label: 'Manual',
    subtitle: 'Ask before every tool call.',
    Icon: FingerprintSvg,
  },
  {
    value: ToolCallPolicy.APPROVE_FOR_ME,
    label: 'Guarded',
    subtitle: 'Automatically approve safe actions, but ask before risky operations.',
    Icon: ProtectSvg,
  },
  {
    value: ToolCallPolicy.AUTO_APPROVE,
    label: 'Auto',
    subtitle: 'Run tools without confirmation.',
    Icon: CheckSvg,
  },
]

export enum ToolCallPolicyDropdownVariant {
  DEFAULT = 'default',
  TOOLBAR = 'toolbar',
}

interface ToolCallPolicyDropdownProps {
  value: ToolCallPolicy
  onChange: (value: ToolCallPolicy) => void
  onBlur?: (e: FocusEvent<HTMLInputElement>) => void
  disabled?: boolean
  className?: string
  variant?: ToolCallPolicyDropdownVariant
}

const ToolCallPolicyDropdown: FC<ToolCallPolicyDropdownProps> = ({
  value,
  onChange,
  onBlur,
  disabled = false,
  className,
  variant = ToolCallPolicyDropdownVariant.DEFAULT,
}) => {
  const isToolbar = variant === ToolCallPolicyDropdownVariant.TOOLBAR
  const isNonDefault = value !== ToolCallPolicy.AUTO_APPROVE
  const selected = POLICY_OPTIONS.find((o) => o.value === value)

  const toolbarStateClassName = isNonDefault
    ? 'text-text-primary bg-surface-elevated'
    : 'text-text-quaternary hover:text-text-primary hover:bg-surface-elevated'

  const rootClassName = isToolbar
    ? cn(
        'flex items-center gap-1.5 !pl-0 !pr-2 py-1 rounded-lg transition-colors text-xs cursor-pointer border-none !bg-transparent',
        toolbarStateClassName
      )
    : 'w-full h-8 gap-1 !px-3 text-xs flex text-text-primary justify-between items-center bg-surface-base-content border border-border-primary rounded-lg transition hover:border-border-secondary cursor-pointer'

  const inputStateClassName = isNonDefault
    ? '!text-text-primary'
    : '!text-text-quaternary group-hover:!text-text-primary'

  const inputClassName = isToolbar
    ? cn('!w-auto !flex-none', inputStateClassName)
    : '!text-text-primary'

  const valueTemplate = () => {
    if (!selected) return null
    const { Icon, label } = selected
    return (
      <div className="flex items-center gap-1.5">
        <Icon className="w-3.5 h-3.5 shrink-0" />
        <span className={cn(isToolbar && 'text-xs font-medium')}>{label}</span>
      </div>
    )
  }

  const itemTemplate = (option: PolicyOption) => {
    const { Icon, label, subtitle } = option
    return (
      <div className="flex items-center gap-2 px-2.5 py-2">
        <Icon className="w-4 h-4 shrink-0" />
        <div className="flex flex-col gap-0.5">
          <span className="text-sm leading-tight">{label}</span>
          <span className="text-xs text-text-tertiary leading-tight">{subtitle}</span>
        </div>
      </div>
    )
  }

  return (
    <div className={cn(!isToolbar && 'w-56 shrink-0', isToolbar && 'group', className)}>
      <Dropdown
        value={value}
        options={POLICY_OPTIONS}
        optionValue="value"
        onChange={(e: DropdownChangeEvent) => onChange(e.value as ToolCallPolicy)}
        onBlur={onBlur}
        disabled={disabled}
        valueTemplate={valueTemplate}
        itemTemplate={itemTemplate}
        className={cn(
          rootClassName,
          disabled &&
            'opacity-50 !cursor-not-allowed hover:!bg-transparent hover:!text-text-quaternary'
        )}
        panelClassName="bg-surface-base-primary mt-2 border overflow-auto bg-surface-base-secondary border-border-specific-panel-outline p-1.5 rounded-lg flex flex-col"
        pt={{
          root: (opts) => (opts?.state.overlayVisible ? '!border-border-secondary' : undefined),
          wrapper: { className: 'order-2' },
          item: { className: 'focus-visible:ring-0 !p-0 rounded-md cursor-pointer' },
          input: {
            className: cn('text-xs', inputClassName),
          },
          trigger: { className: cn(isToolbar ? '!text-inherit' : '!text-text-primary') },
        }}
        collapseIcon={
          isToolbar ? (
            <ChevronDownSvg className="w-3 h-3 shrink-0 opacity-60" />
          ) : (
            <ChevronDownSvg className="text-text-secondary w-4.5 h-4.5" />
          )
        }
        dropdownIcon={
          isToolbar ? (
            <ChevronDownSvg className="w-3 h-3 shrink-0 opacity-60" />
          ) : (
            <ChevronDownSvg className="text-text-secondary w-4.5 h-4.5" />
          )
        }
      />
    </div>
  )
}

export default ToolCallPolicyDropdown
