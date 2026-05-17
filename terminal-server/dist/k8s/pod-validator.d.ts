import type { CoreV1Api } from "@kubernetes/client-node";
export declare class PodValidationError extends Error {
    constructor(message: string);
}
export declare function assertNamespaceAllowed(namespace: string): void;
export declare function resolveTargetContainer(api: CoreV1Api, namespace: string, podName: string, requestedContainer?: string): Promise<string>;
