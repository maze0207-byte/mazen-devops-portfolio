import * as k8s from "@kubernetes/client-node";
export declare function getKubeConfig(): k8s.KubeConfig;
export declare function getCoreApi(): k8s.CoreV1Api;
export declare function createExec(): k8s.Exec;
export declare function isInCluster(): boolean;
