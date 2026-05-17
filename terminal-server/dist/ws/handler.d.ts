import type { IncomingMessage } from "node:http";
import type { WebSocket } from "ws";
import { SessionManager } from "../session/manager";
export declare function attachWebSocketHandlers(ws: WebSocket, req: IncomingMessage, sessionManager: SessionManager): void;
