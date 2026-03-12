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

# This is a multi-stage Dockerfile. It is used to build the application and then run it in a separate container.
FROM dhi.io/node:20-alpine3.23-dev AS build
ENV VITE_ONBOARDING_ASSISTANT_SLUG='codemie-onboarding'
ENV VITE_FEEDBACK_ASSISTANT_SLUG='codemie-feedback'
ENV VITE_CHATBOT_ASSISTANT_SLUG='ai-run-chatbot'
# Set the working directory
WORKDIR /app
# Copy only the package.json and package-lock.json files to the working directory to install dependencies
COPY package.json /app/package.json
COPY package-lock.json /app/package-lock.json
# Install the dependencies
RUN npm ci
# Copy the rest of the files to the working directory
COPY . /app
# Build the application. Files will be generated in the dist folder
RUN npm run build:prod

FROM dhi.io/nginx:1.28-alpine3.23
# Copy the files from the build stage to the nginx container
COPY --from=build /app/dist /usr/share/nginx/html
# docker run --name codemie-ui-az -p 8081:8080 -d codemie-custom-ui:v9
# Expose the port the app listens on
EXPOSE 8080
# Copy the nginx configuration template to the container
COPY nginx.conf /etc/nginx/conf.d/default.conf
# Copy the config.js file to the container
COPY config.js /usr/share/nginx/html/config.js
# Set the user to nginx
USER nginx
# Start the app
CMD ["-g", "daemon off;"]
