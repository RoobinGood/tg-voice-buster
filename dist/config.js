"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const dotenv_1 = __importDefault(require("dotenv"));
dotenv_1.default.config();
const getRequiredEnv = (key) => {
    const value = process.env[key];
    if (!value) {
        throw new Error(`Missing env var: ${key}`);
    }
    return value;
};
const getOptionalEnv = (key, fallback) => {
    return process.env[key] ?? fallback;
};
const parseNumber = (key, fallback) => {
    const raw = process.env[key];
    if (!raw) {
        return fallback;
    }
    const value = Number(raw);
    if (Number.isNaN(value)) {
        throw new Error(`Invalid number for env var: ${key}`);
    }
    return value;
};
const parseBoolean = (key, fallback) => {
    const raw = process.env[key];
    if (!raw) {
        return fallback;
    }
    return raw === "true" || raw === "1";
};
const parseAllowedUserIds = (raw) => {
    if (!raw) {
        return new Set();
    }
    const values = raw
        .split(",")
        .map((value) => value.trim())
        .filter((value) => value.length > 0)
        .map((value) => Number(value))
        .filter((value) => !Number.isNaN(value));
    return new Set(values);
};
const postprocessEnabled = parseBoolean("POSTPROCESS_ENABLED", false);
const config = {
    telegramToken: getRequiredEnv("TELEGRAM_BOT_TOKEN"),
    allowedUserIds: parseAllowedUserIds(process.env.ALLOWED_USER_IDS),
    tmpDir: getOptionalEnv("TMP_DIR", "tmp"),
    ffmpegPath: getOptionalEnv("FFMPEG_PATH", "ffmpeg"),
    audioSpeed: parseNumber("AUDIO_SPEED", 1),
    telegramMessageLimit: parseNumber("TELEGRAM_MESSAGE_LIMIT", 4000),
    telegramSendDelayMs: parseNumber("TELEGRAM_SEND_DELAY_MS", 250),
    stt: {
        apiUrl: getRequiredEnv("STT_API_URL"),
        apiKey: getRequiredEnv("STT_API_KEY"),
        model: getRequiredEnv("STT_MODEL"),
        responseFormat: getOptionalEnv("STT_RESPONSE_FORMAT", "text"),
        temperature: parseNumber("STT_TEMPERATURE", 0.5),
        language: getOptionalEnv("STT_LANGUAGE", "ru"),
        timeoutMs: parseNumber("STT_TIMEOUT_MS", 120000),
    },
    postprocessEnabled,
    llm: postprocessEnabled
        ? {
            apiUrl: getRequiredEnv("LLM_API_URL"),
            apiKey: getRequiredEnv("LLM_API_KEY"),
            model: getRequiredEnv("LLM_MODEL"),
            temperature: parseNumber("LLM_TEMPERATURE", 0),
            timeoutMs: parseNumber("LLM_TIMEOUT_MS", 120000),
        }
        : undefined,
};
exports.default = config;
