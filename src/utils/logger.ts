type LogLevel = "INFO" | "ERROR";

type LogData = Record<string, unknown>;

const formatValue = (value: unknown): string => {
  if (value === null) {
    return "null";
  }
  if (value === undefined) {
    return "undefined";
  }
  if (typeof value === "string") {
    if (value.length === 0) {
      return "\"\"";
    }
    if (/[\s="]/.test(value)) {
      return JSON.stringify(value);
    }
    return value;
  }
  if (typeof value === "number" || typeof value === "boolean") {
    return String(value);
  }
  try {
    return JSON.stringify(value);
  } catch {
    return "\"[unserializable]\"";
  }
};

const formatData = (data?: LogData): string => {
  if (!data) {
    return "";
  }
  const tokens = Object.entries(data)
    .filter(([, value]) => value !== undefined)
    .map(([key, value]) => `${key}=${formatValue(value)}`);
  return tokens.length > 0 ? ` ${tokens.join(" ")}` : "";
};

const logLine = (level: LogLevel, event: string, data?: LogData): void => {
  const time = new Date().toISOString();
  const line = `time=${time} level=${level} event=${event}${formatData(data)}`;
  if (level === "ERROR") {
    console.error(line);
    return;
  }
  console.log(line);
};

export const logInfo = (event: string, data?: LogData): void => {
  logLine("INFO", event, data);
};

export const logError = (event: string, data?: LogData): void => {
  logLine("ERROR", event, data);
};
