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

# TODO: Revert to dhi.io/nginx:1.28-alpine3.23 once base image ships with zlib >= 1.3.2-r0
# Remediation for CVE-2026-22184 (zlib@1.3.1 bundled in base image)
FROM dhi.io/nginx:1.28-alpine3.23-dev

RUN apk add --no-cache zlib=1.3.2-r0

COPY /dist /usr/share/nginx/html

# Expose the port the app listens on
EXPOSE 8080

# Copy the nginx configuration template to the container
COPY nginx.conf /etc/nginx/conf.d/default.conf

USER nginx

# Start the app
CMD ["nginx", "-g", "daemon off;"]
