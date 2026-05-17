import * as k8s from "@kubernetes/client-node"
import { log } from "../logger"

let kubeConfig: k8s.KubeConfig | null = null
let coreApi: k8s.CoreV1Api | null = null

export function getKubeConfig(): k8s.KubeConfig {
  if (kubeConfig) return kubeConfig

  const kc = new k8s.KubeConfig()

  if (process.env.KUBERNETES_SERVICE_HOST) {
    kc.loadFromCluster()
    log("INFO", "kubeconfig_loaded", { mode: "in-cluster" })
  } else if (process.env.ALLOW_LOCAL_FALLBACK === "true") {
    kc.loadFromDefault()
    log("WARN", "kubeconfig_loaded", { mode: "local-default-fallback" })
  } else {
    throw new Error(
      "Not running inside Kubernetes. Set KUBERNETES_SERVICE_HOST or enable ALLOW_LOCAL_FALLBACK=true for dev.",
    )
  }

  kubeConfig = kc
  return kc
}

export function getCoreApi(): k8s.CoreV1Api {
  if (coreApi) return coreApi
  coreApi = getKubeConfig().makeApiClient(k8s.CoreV1Api)
  return coreApi
}

export function createExec(): k8s.Exec {
  return new k8s.Exec(getKubeConfig())
}

export function isInCluster(): boolean {
  return Boolean(process.env.KUBERNETES_SERVICE_HOST)
}
