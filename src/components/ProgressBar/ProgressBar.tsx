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

const ProgressBar = ({ value, min = 0, max = 100 }) => {
  let percentage: number
  if (min === max) {
    percentage = max === 0 ? 0 : 100
  } else {
    percentage = Math.floor(((value - min) / (max - min)) * 100)
  }
  return (
    <div className="relative overflow-hidden bg-surface-base-primary rounded-[68px] w-[85px] border border-border-secondary">
      <div
        style={{ width: `${percentage}%` }}
        className="bg-surface-specific-button-secondary-hover-to h-[14px] transition-width duration-200 ease-out"
      />
      <div className="text-[9px] leading-[10px] font-semibold text-text-primary absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2">
        {percentage}%
      </div>
    </div>
  )
}

export default ProgressBar
