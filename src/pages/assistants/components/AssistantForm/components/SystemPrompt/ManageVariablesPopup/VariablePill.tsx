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

interface ValuePillProps {
  value: string
  userDefined?: boolean
}

const VariablePill = ({ value, userDefined = false }: ValuePillProps) => {
  return (
    <span className="flex fle-row items-center border-surface-base-tertiary my-1 py-1.5 px-2 rounded-xl bg-border-structural font-semibold w-fit break-keep">
      {userDefined && (
        <span className="inline-block min-w-2 min-h-2 align-middle rounded-full bg-in-progress-primary mr-2 mt-0.5 ml-0.5"></span>
      )}
      {value}
    </span>
  )
}

export default VariablePill
