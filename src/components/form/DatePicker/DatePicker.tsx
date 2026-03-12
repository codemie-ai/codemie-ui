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

import { Dropdown } from 'primereact/dropdown'
import { forwardRef, useRef } from 'react'
import ReactDatePicker from 'react-datepicker'

import { cn } from '@/utils/utils'

export interface DatePickerProps {
  id?: string
  name?: string
  value?: string | null
  onChange: (value: string | null) => void
  placeholder?: string
  className?: string
  rootClassName?: string
  disabled?: boolean
  label?: string
  error?: string
  errorClassName?: string
  minDate?: string
  maxDate?: string
  dateFormat?: string
  showTime?: boolean
  hourFormat?: '12' | '24'
  required?: boolean
  timeIntervals?: number
}

interface CustomHeaderProps {
  date: Date
  decreaseMonth: () => void
  increaseMonth: () => void
  decreaseYear: () => void
  increaseYear: () => void
  prevMonthButtonDisabled: boolean
  nextMonthButtonDisabled: boolean
  prevYearButtonDisabled: boolean
  nextYearButtonDisabled: boolean
  changeYear: (year: number) => void
  changeMonth: (month: number) => void
}

const CustomHeader = ({
  date,
  decreaseMonth,
  increaseMonth,
  prevMonthButtonDisabled,
  nextMonthButtonDisabled,
  changeYear,
  changeMonth,
}: CustomHeaderProps) => {
  const months = [
    'January',
    'February',
    'March',
    'April',
    'May',
    'June',
    'July',
    'August',
    'September',
    'October',
    'November',
    'December',
  ]

  const monthOptions = months.map((month, index) => ({ label: month, value: index }))
  const years = Array.from({ length: 100 }, (_, i) => new Date().getFullYear() - 50 + i)
  const yearOptions = years.map((year) => ({ label: year.toString(), value: year }))

  return (
    <div className="flex items-center justify-between gap-3 mb-4">
      <button
        type="button"
        onClick={decreaseMonth}
        disabled={prevMonthButtonDisabled}
        className="text-text-secondary hover:text-text-primary transition-colors disabled:opacity-30 disabled:cursor-not-allowed p-1"
      >
        <svg
          width="20"
          height="20"
          viewBox="0 0 20 20"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
        >
          <path
            d="M12.5 15L7.5 10L12.5 5"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      </button>

      <div className="flex items-center gap-3 flex-1">
        <Dropdown
          value={date.getMonth()}
          options={monthOptions}
          onChange={(e) => changeMonth(e.value)}
          className="flex-1 !w-32 !min-w-32"
          panelClassName="!max-h-60"
          appendTo="self"
        />

        <Dropdown
          value={date.getFullYear()}
          options={yearOptions}
          onChange={(e) => changeYear(e.value)}
          className="flex-1 !w-24 !min-w-24"
          panelClassName="!max-h-60"
          appendTo="self"
        />
      </div>

      <button
        type="button"
        onClick={increaseMonth}
        disabled={nextMonthButtonDisabled}
        className="text-text-secondary hover:text-text-primary transition-colors disabled:opacity-30 disabled:cursor-not-allowed p-1"
      >
        <svg
          width="20"
          height="20"
          viewBox="0 0 20 20"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
        >
          <path
            d="M7.5 15L12.5 10L7.5 5"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      </button>
    </div>
  )
}

const DatePicker = forwardRef<ReactDatePicker, DatePickerProps>(
  (
    {
      id,
      name,
      value,
      onChange,
      placeholder,
      className = '',
      rootClassName,
      disabled = false,
      label,
      error,
      errorClassName,
      minDate,
      maxDate,
      dateFormat = 'MM/dd/yyyy',
      showTime = false,
      hourFormat = '24',
      required = false,
      timeIntervals = 30,
    },
    ref
  ) => {
    const dateValue = value ? new Date(value) : null
    const minDateValue = minDate ? new Date(minDate) : undefined
    const maxDateValue = maxDate ? new Date(maxDate) : undefined

    // Track displayed month for detecting outside month days
    const displayedMonthRef = useRef<Date>(dateValue ?? new Date())

    const handleChange = (date: Date | null) => {
      if (!date) {
        onChange(null)
        return
      }

      const isoString = date.toISOString().replace(/\.\d{3}Z$/, 'Z')
      onChange(isoString)
    }

    return (
      <div className={cn('flex flex-col', rootClassName)}>
        <label className="flex flex-col">
          {label && (
            <div className="text-xs text-text-quaternary mb-2">
              {label}
              {required && <span className="text-text-error ml-0.5">*</span>}
            </div>
          )}
          <ReactDatePicker
            ref={ref}
            id={id}
            name={name}
            selected={dateValue}
            autoComplete="off"
            onChange={handleChange}
            disabled={disabled}
            showPopperArrow={false}
            placeholderText={placeholder}
            minDate={minDateValue}
            maxDate={maxDateValue}
            dateFormat={showTime ? `${dateFormat} HH:mm` : dateFormat}
            showTimeSelect={showTime}
            timeFormat={hourFormat === '12' ? 'h:mm aa' : 'HH:mm'}
            timeIntervals={timeIntervals}
            timeCaption="Time"
            filterTime={(time) => {
              // Filter out times that fall outside min/max range (exclusive boundaries)
              return (
                !(minDateValue && time <= minDateValue) && !(maxDateValue && time >= maxDateValue)
              )
            }}
            renderCustomHeader={(props) => {
              displayedMonthRef.current = props.date
              return <CustomHeader {...props} />
            }}
            calendarClassName="!bg-surface-base-primary !border !border-border-specific-panel-outline !rounded-lg !shadow-lg !p-4 !font-geist"
            wrapperClassName="w-full"
            popperClassName="!z-50 -mt-1"
            popperPlacement="bottom-end"
            portalId="app"
            dayClassName={(date) => {
              const isSelected = dateValue && date.toDateString() === dateValue.toDateString()
              const isToday = date.toDateString() === new Date().toDateString()
              // Check if day is outside the displayed month
              const isOutsideMonth = date.getMonth() !== displayedMonthRef.current.getMonth()

              // Check if date is disabled - compare only date portion, not time
              // Strip time component for day-level comparison
              const dateOnly = new Date(date.getFullYear(), date.getMonth(), date.getDate())
              const minDateOnly = minDateValue
                ? new Date(
                    minDateValue.getFullYear(),
                    minDateValue.getMonth(),
                    minDateValue.getDate()
                  )
                : null
              const maxDateOnly = maxDateValue
                ? new Date(
                    maxDateValue.getFullYear(),
                    maxDateValue.getMonth(),
                    maxDateValue.getDate()
                  )
                : null

              const isDisabled =
                (minDateOnly && dateOnly < minDateOnly) || (maxDateOnly && dateOnly > maxDateOnly)

              return cn(
                '!w-9 !h-9 !leading-9 !text-center !text-sm !rounded-lg !transition-colors !m-0.5 !inline-flex !items-center !justify-center',
                // Base state
                '!text-text-primary',
                // Outside month days - dimmed
                isOutsideMonth && '!text-text-tertiary !opacity-50',
                // Selected state
                isSelected &&
                  '!bg-in-progress-primary !text-white hover:!bg-in-progress-primary !font-medium !opacity-100',
                // Today state (not selected)
                isToday && !isSelected && '!border !border-in-progress-primary !font-medium',
                // Disabled state
                isDisabled &&
                  '!text-text-tertiary !opacity-40 !cursor-not-allowed hover:!bg-transparent',
                // Hover state (not selected, not disabled)
                !isSelected && !isDisabled && 'hover:!bg-in-progress-primary/20 !cursor-pointer'
              )
            }}
            weekDayClassName={() =>
              '!text-text-tertiary !text-xs !font-medium !uppercase !w-9 !m-0.5'
            }
            calendarStartDay={0}
            timeClassName={(time) => {
              const isSelected =
                dateValue &&
                time.getHours() === dateValue.getHours() &&
                time.getMinutes() === dateValue.getMinutes()

              // Check if this time is outside the min/max range (exclusive boundaries)
              const isDisabled =
                (minDateValue && time <= minDateValue) || (maxDateValue && time >= maxDateValue)

              return cn(
                '!text-text-primary hover:!bg-in-progress-primary/20 !rounded-lg !px-3 !py-1.5 !cursor-pointer !transition-colors !text-sm !my-0.5',
                isSelected &&
                  '!bg-in-progress-primary/30 !text-white hover:!bg-in-progress-primary/30',
                isDisabled &&
                  '!text-text-tertiary !opacity-40 !cursor-not-allowed hover:!bg-transparent'
              )
            }}
            className={cn(
              'h-8 w-full px-2 text-sm text-text-primary bg-surface-base-content border border-border-primary rounded-lg transition hover:border-border-secondary focus:outline-none focus:border-in-progress-primary placeholder:text-text-specific-input-placeholder',
              disabled && 'cursor-not-allowed opacity-50',
              className
            )}
          />
        </label>
        {error && (
          <div className={cn('text-sm text-failed-secondary mt-2', errorClassName)}>{error}</div>
        )}
      </div>
    )
  }
)

DatePicker.displayName = 'DatePicker'

export default DatePicker
