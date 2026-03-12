# codemie-ui

![Version: 0.1.0](https://img.shields.io/badge/Version-0.1.0-informational?style=flat-square) ![Type: application](https://img.shields.io/badge/Type-application-informational?style=flat-square) ![AppVersion: 0.1.0](https://img.shields.io/badge/AppVersion-0.1.0-informational?style=flat-square)

A Helm chart for AI/Run UI

**Homepage:** <https://codemie.lab.epam.com>

## Maintainers

| Name | Email | Url |
| ---- | ------ | --- |
| AI/Run | <SpecialEPM-CDMEDevelopmentTeam@epam.com> |  |

## Source Code

* <https://gitbud.epam.com/epm-cdme/codemie-ui.git>

## Values

| Key | Type | Default | Description |
|-----|------|---------|-------------|
| affinity | object | `{}` | Assign affinity rules to the deployment. |
| fullnameOverride | string | `""` |  |
| image.pullPolicy | string | `"IfNotPresent"` | Image pull policy for the AI/Run UI. |
| image.repository | string | `""` | Repository to use for the AI/Run UI. |
| image.tag | string | `""` | Overrides the image tag whose default is the chart appVersion. |
| imagePullSecrets | list | `[]` | Secrets with credentials to pull images from a private registry. |
| ingress.annotations | object | `{"nginx.ingress.kubernetes.io/auth-response-headers":"X-Auth-Request-Access-Token,Authorization","nginx.ingress.kubernetes.io/auth-signin":"https://$host/oauth2/start?rd=$escaped_request_uri","nginx.ingress.kubernetes.io/auth-url":"http://oauth2-proxy.oauth2-proxy.svc.cluster.local:80/oauth2/auth","nginx.ingress.kubernetes.io/proxy-buffer-size":"64k","nginx.ingress.kubernetes.io/rewrite-target":"/$1"}` | Additional ingress annotations |
| ingress.enabled | bool | `true` | Enable an ingress resource for the AI/Run UI |
| ingress.host | string | `"codemie.%%DOMAIN%%"` | AI/Run UI hostname |
| ingress.ingressClassName | string | `"nginx"` | Defines which ingress controller will implement the resource |
| ingress.path | string | `"/(.*)"` | The path to AI/Run UI |
| ingress.pathType | string | `"ImplementationSpecific"` | Ingress path type. One of `Exact`, `Prefix` or `ImplementationSpecific` |
| ingress.tls | list | `[]` | AI/Run UI ingress TLS configuration |
| livenessProbe.failureThreshold | int | `3` | Minimum consecutive failures for the probe to be considered failed after having succeeded |
| livenessProbe.httpGet.path | string | `"/healthcheck"` |  |
| livenessProbe.httpGet.port | int | `8080` |  |
| livenessProbe.initialDelaySeconds | int | `10` | Number of seconds after the container has started before probe is initiated |
| livenessProbe.periodSeconds | int | `15` | How often (in seconds) to perform the probe |
| livenessProbe.successThreshold | int | `1` | Minimum consecutive successes for the probe to be considered successful after having failed |
| livenessProbe.timeoutSeconds | int | `1` | Number of seconds after which the probe times out |
| nameOverride | string | `""` |  |
| nodeSelector | object | `{}` | Node selector to be added to the AI/Run UI pods. |
| podAnnotations | object | `{}` | Annotations to be added to AI/Run UI pods. |
| podLabels | object | `{}` | Labels to be added to AI/Run UI pods. |
| podSecurityContext | object | `{}` | Toggle and define pod-level security context. |
| priorityClassName | string | `""` | Priority class for the pod |
| readinessProbe.failureThreshold | int | `3` | Minimum consecutive failures for the probe to be considered failed after having succeeded |
| readinessProbe.httpGet.path | string | `"/healthcheck"` |  |
| readinessProbe.httpGet.port | int | `8080` |  |
| readinessProbe.initialDelaySeconds | int | `10` | Number of seconds after the container has started before probe is initiated |
| readinessProbe.periodSeconds | int | `15` | How often (in seconds) to perform the probe |
| readinessProbe.successThreshold | int | `1` | Minimum consecutive successes for the probe to be considered successful after having failed |
| readinessProbe.timeoutSeconds | int | `1` | Number of seconds after which the probe times out |
| replicaCount | int | `1` | The number of AI/Run UI pods to run. |
| resources | object | `{"limits":{"cpu":"100m","memory":"128Mi"},"requests":{"cpu":"100m","memory":"128Mi"}}` | Resource limits and requests for the AI/Run UI pods. |
| securityContext | object | `{}` | AI/Run UI container-level security context. |
| service.annotations | object | `{}` | AI/Run UI service annotations |
| service.port | int | `8080` | AI/Run UI service port |
| service.type | string | `"ClusterIP"` | AI/Run UI service type |
| serviceAccount.annotations | object | `{}` | Annotations applied to created service account |
| serviceAccount.create | bool | `false` | Specifies whether a service account should be created |
| serviceAccount.name | string | `""` | Service account name for AI/Run UI pod If not set and create is true, a name is generated using the fullname template |
| tolerations | list | `[]` | Node selector to be added to the AI/Run UI pods. |
| viteApiUrl | string | `"https://codemie.%%DOMAIN%%/code-assistant-api"` | AI/Run UI API URL |
| viteEnableAnalytics | bool | `false` | Enable analytics feature in AI/Run UI |
| viteEnv | string | `"prod"` | AI/Run UI ENV. Set to local for dev development |
