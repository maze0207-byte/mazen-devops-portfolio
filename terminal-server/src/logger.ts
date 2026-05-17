type LogLevel = "INFO" | "WARN" | "ERROR" | "DEBUG"

export function log(level: LogLevel, event: string, meta?: Record<string, unknown>) {
  const entry = { ts: new Date().toISOString(), level, event, ...meta }
  const line = JSON.stringify(entry)
  if (level === "ERROR") console.error(line)
  else console.log(line)
}
