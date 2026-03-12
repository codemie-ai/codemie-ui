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

import { ChangeEvent, forwardRef, useState } from 'react'

import ExpandIcon from '@/assets/icons/expand.svg?react'
import Button from '@/components/Button'
import Textarea, { TextareaProps, TextareaRef } from '@/components/form/Textarea'
import Popup from '@/components/Popup'
import { ButtonType } from '@/constants'
import { cn } from '@/utils/utils'

type CustomChangeEvent = {
  target: { value: string }
}

export interface ExpandableTextareaProps extends Omit<TextareaProps, 'onChange'> {
  onChange: (e: CustomChangeEvent) => void
}

const ExpandableTextarea = forwardRef<TextareaRef, ExpandableTextareaProps>(
  ({ value, onChange, ...textareaProps }, ref) => {
    const [isExpanded, setIsExpanded] = useState(false)
    const [expandedValue, setExpandedValue] = useState('')

    const handleExpand = () => {
      setExpandedValue(value ?? '')
      setIsExpanded(true)
    }

    const handleClose = () => {
      setIsExpanded(false)
    }

    const handleSave = () => {
      if (onChange) {
        const event: CustomChangeEvent = {
          target: { value: expandedValue },
        }
        onChange(event)
      }
      handleClose()
    }

    const handleExpandedChange = (e: ChangeEvent<HTMLTextAreaElement>) => {
      setExpandedValue(e.target.value)
    }

    return (
      <>
        <TextareaWrapper
          ref={ref}
          value={value}
          onChange={onChange}
          onExpand={handleExpand}
          {...textareaProps}
        />

        <Popup
          isFullWidth
          dismissableMask={false}
          withBorder={false}
          header={textareaProps.label}
          visible={isExpanded}
          onHide={handleClose}
          onSubmit={handleSave}
          submitText="Save"
          cancelText="Cancel"
          className="h-full !max-w-4xl"
          bodyClassName="!pt-0"
        >
          <TextareaWrapper
            ref={ref}
            value={expandedValue}
            onChange={handleExpandedChange}
            {...textareaProps}
          />
        </Popup>
      </>
    )
  }
)

export default ExpandableTextarea

interface TextareaWrapperProps extends TextareaProps {
  onExpand?: () => void
}

const TextareaWrapper = forwardRef<TextareaRef, TextareaWrapperProps>(
  ({ error, label, rootClass, className, onExpand, ...props }, ref) => {
    const isInPopup = !onExpand

    const expandButton = (
      <Button variant={ButtonType.SECONDARY} onClick={onExpand}>
        <ExpandIcon className="w-4 h-4" />
        <span className="text-xs">Expand</span>
      </Button>
    )

    return (
      <Textarea
        ref={ref}
        error={isInPopup ? '' : error}
        label={isInPopup ? undefined : label}
        rootClass={cn(isInPopup && 'h-full', rootClass)}
        className={cn(isInPopup && 'resize-none min-h-full', className)}
        headerContent={isInPopup ? null : expandButton}
        {...props}
      />
    )
  }
)
