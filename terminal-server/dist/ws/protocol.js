"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.parseClientMessage = parseClientMessage;
exports.sendJson = sendJson;
function parseClientMessage(raw) {
    const str = typeof raw === "string" ? raw : raw.toString("utf8");
    try {
        const parsed = JSON.parse(str);
        if (parsed && typeof parsed.type === "string")
            return parsed;
    }
    catch {
        // backward compat: raw keystrokes
        if (str.length > 0)
            return { type: "input", data: str };
    }
    return null;
}
function sendJson(ws, msg) {
    if (ws.readyState === 1)
        ws.send(JSON.stringify(msg));
}
