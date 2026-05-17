import type { CoreV1Api } from "@kubernetes/client-node"
import { config } from "../config"
import { log } from "../logger"

export class PodValidationError extends Error {
  constructor(message: string) {
    super(message)
    this.name = "PodValidationError"
  }
}

export function assertNamespaceAllowed(namespace: string): void {
  if (!config.allowedNamespaces.includes(namespace)) {
    throw new PodValidationError(
      `Namespace "${namespace}" is not allowed. Allowed: ${config.allowedNamespaces.join(", ")}`,
    )
  }
}

export async function resolveTargetContainer(
  api: CoreV1Api,
  namespace: string,
  podName: string,
  requestedContainer?: string,
): Promise<string> {
  assertNamespaceAllowed(namespace)

  const pod = await api.readNamespacedPod({ name: podName, namespace })

  if (pod.status?.phase !== "Running") {
    throw new PodValidationError(`Pod "${podName}" is not Running (phase=${pod.status?.phase ?? "unknown"})`)
  }

  const containers = pod.spec?.containers ?? []
  if (containers.length === 0) {
    throw new PodValidationError(`Pod "${podName}" has no containers`)
  }

  if (requestedContainer) {
    const found = containers.find((c) => c.name === requestedContainer)
    if (!found) {
      throw new PodValidationError(
        `Container "${requestedContainer}" not found in pod "${podName}"`,
      )
    }
    return requestedContainer
  }

  const defaultName = config.defaultContainer || containers[0].name
  log("INFO", "pod_validated", { namespace, pod: podName, container: defaultName })
  return defaultName
}
