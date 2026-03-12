# Copyright 2026 EPAM Systems, Inc. ("EPAM")
#
# Licensed under the Apache License, Version 2.0 (the "License");
# you may not use this file except in compliance with the License.
# You may obtain a copy of the License at
#
#     http://www.apache.org/licenses/LICENSE-2.0
#
# Unless required by applicable law or agreed to in writing, software
# distributed under the License is distributed on an "AS IS" BASIS,
# WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
# See the License for the specific language governing permissions and
# limitations under the License.
#

FROM dhi.io/node:20-alpine3.23-dev AS build

# hadolint ignore=DL3018
RUN apk update && apk add --no-cache openjdk17 maven

WORKDIR /app
# Copy only the package.json and package-lock.json files to the working directory to install dependencies
COPY package.json /app/package.json
COPY package-lock.json /app/package-lock.json
# Install the dependencies
RUN npm ci
# Copy the rest of the files to the working directory
COPY . /app
# Build the application. Files will be generated in the dist folder
# hadolint ignore=DL3059
RUN npm run build:keycloak

FROM dhi.io/busybox:1.37.0-alpine3.22
# Copy only generated artifact to well-known location
COPY --from=build /app/dist_keycloak/keycloak-theme-codemie.jar /opt/keycloak-theme/

USER nobody

