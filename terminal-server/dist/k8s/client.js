"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.getKubeConfig = getKubeConfig;
exports.getCoreApi = getCoreApi;
exports.createExec = createExec;
exports.isInCluster = isInCluster;
const k8s = __importStar(require("@kubernetes/client-node"));
const logger_1 = require("../logger");
let kubeConfig = null;
let coreApi = null;
function getKubeConfig() {
    if (kubeConfig)
        return kubeConfig;
    const kc = new k8s.KubeConfig();
    if (process.env.KUBERNETES_SERVICE_HOST) {
        kc.loadFromCluster();
        (0, logger_1.log)("INFO", "kubeconfig_loaded", { mode: "in-cluster" });
    }
    else if (process.env.ALLOW_LOCAL_FALLBACK === "true") {
        kc.loadFromDefault();
        (0, logger_1.log)("WARN", "kubeconfig_loaded", { mode: "local-default-fallback" });
    }
    else {
        throw new Error("Not running inside Kubernetes. Set KUBERNETES_SERVICE_HOST or enable ALLOW_LOCAL_FALLBACK=true for dev.");
    }
    kubeConfig = kc;
    return kc;
}
function getCoreApi() {
    if (coreApi)
        return coreApi;
    coreApi = getKubeConfig().makeApiClient(k8s.CoreV1Api);
    return coreApi;
}
function createExec() {
    return new k8s.Exec(getKubeConfig());
}
function isInCluster() {
    return Boolean(process.env.KUBERNETES_SERVICE_HOST);
}
