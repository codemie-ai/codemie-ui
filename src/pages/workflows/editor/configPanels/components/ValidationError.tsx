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

interface ValidationErrorProps {
  message?: string
}

const ValidationError = ({ message }: ValidationErrorProps) => {
  if (!message) return null

  return (
    <div
      className="bg-failed-secondary/10 border border-failed-secondary rounded-md px-3 py-2.5"
      role="alert"
    >
      <div className="flex items-start gap-2">
        <p className="text-failed-secondary text-xs leading-relaxed">{message}</p>
      </div>
    </div>
  )
}

export default ValidationError
