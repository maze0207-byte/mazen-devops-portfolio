"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.log = log;
function log(level, event, meta) {
    const entry = { ts: new Date().toISOString(), level, event, ...meta };
    const line = JSON.stringify(entry);
    if (level === "ERROR")
        console.error(line);
    else
        console.log(line);
}
