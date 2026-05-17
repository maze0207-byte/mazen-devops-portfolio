"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.PodValidationError = void 0;
exports.assertNamespaceAllowed = assertNamespaceAllowed;
exports.resolveTargetContainer = resolveTargetContainer;
const config_1 = require("../config");
const logger_1 = require("../logger");
class PodValidationError extends Error {
    constructor(message) {
        super(message);
        this.name = "PodValidationError";
    }
}
exports.PodValidationError = PodValidationError;
function assertNamespaceAllowed(namespace) {
    if (!config_1.config.allowedNamespaces.includes(namespace)) {
        throw new PodValidationError(`Namespace "${namespace}" is not allowed. Allowed: ${config_1.config.allowedNamespaces.join(", ")}`);
    }
}
async function resolveTargetContainer(api, namespace, podName, requestedContainer) {
    assertNamespaceAllowed(namespace);
    const pod = await api.readNamespacedPod({ name: podName, namespace });
    if (pod.status?.phase !== "Running") {
        throw new PodValidationError(`Pod "${podName}" is not Running (phase=${pod.status?.phase ?? "unknown"})`);
    }
    const containers = pod.spec?.containers ?? [];
    if (containers.length === 0) {
        throw new PodValidationError(`Pod "${podName}" has no containers`);
    }
    if (requestedContainer) {
        const found = containers.find((c) => c.name === requestedContainer);
        if (!found) {
            throw new PodValidationError(`Container "${requestedContainer}" not found in pod "${podName}"`);
        }
        return requestedContainer;
    }
    const defaultName = config_1.config.defaultContainer || containers[0].name;
    (0, logger_1.log)("INFO", "pod_validated", { namespace, pod: podName, container: defaultName });
    return defaultName;
}
