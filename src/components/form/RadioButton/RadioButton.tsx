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

import {
  RadioButton as PrimeRadioButton,
  RadioButtonProps as PrimeRadioButtonProps,
} from 'primereact/radiobutton'
import React from 'react'
import { twMerge } from 'tailwind-merge'

export interface RadioButtonProps extends Omit<PrimeRadioButtonProps, 'pt'> {
  label?: string
  className?: string
  labelClassName?: string
}

const RadioButton: React.FC<RadioButtonProps> = ({
  label,
  className,
  labelClassName,
  ...props
}) => {
  const customPT = {
    root: {
      className: twMerge('flex items-center text-sm', className),
    },
    input: {
      className: 'absolute opacity-0 cursor-pointer z-10 w-full h-full left-0 top-0',
    },
    box: {
      className: twMerge(
        'transition border min-w-[18px] w-[18px] h-[18px] inline-block rounded-full relative',
        'after:content-[""] after:block after:w-[9px] after:h-[9px] after:absolute',
        'after:top-[50%] after:left-[50%] after:rounded-full after:transform after:-translate-x-1/2 after:-translate-y-1/2',
        'after:scale-0 after:transition-transform after:duration-100 after:ease-in',
        'border-text-primary after:bg-text-primary',
        props.checked && 'after:scale-100 border-text-primary after:!bg-border-accent',
        'group-hover:border-border-accent group-hover:after:bg-border-accent'
      ),
    },
  }

  return (
    <label
      htmlFor={props.inputId}
      className="flex items-center group cursor-pointer text-text-primary hover:text-border-accent transition"
    >
      <PrimeRadioButton {...props} pt={customPT} />
      {label && (
        <span
          className={twMerge(
            'ml-2 cursor-pointer text-sm transition',
            labelClassName,
            props.checked && 'hover:text-border-accent'
          )}
        >
          {label}
        </span>
      )}
    </label>
  )
}

export default RadioButton
