"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.logError = exports.logInfo = void 0;
const formatValue = (value) => {
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
    }
    catch {
        return "\"[unserializable]\"";
    }
};
const formatData = (data) => {
    if (!data) {
        return "";
    }
    const tokens = Object.entries(data)
        .filter(([, value]) => value !== undefined)
        .map(([key, value]) => `${key}=${formatValue(value)}`);
    return tokens.length > 0 ? ` ${tokens.join(" ")}` : "";
};
const logLine = (level, event, data) => {
    const time = new Date().toISOString();
    const line = `time=${time} level=${level} event=${event}${formatData(data)}`;
    if (level === "ERROR") {
        console.error(line);
        return;
    }
    console.log(line);
};
const logInfo = (event, data) => {
    logLine("INFO", event, data);
};
exports.logInfo = logInfo;
const logError = (event, data) => {
    logLine("ERROR", event, data);
};
exports.logError = logError;
