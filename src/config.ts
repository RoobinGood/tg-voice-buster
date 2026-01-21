import dotenv from "dotenv";

dotenv.config();

type SttConfig = {
  apiUrl: string;
  apiKey: string;
  model: string;
  responseFormat: string;
  temperature: number;
  language: string;
  timeoutMs: number;
};

type LlmConfig = {
  apiUrl: string;
  apiKey: string;
  model: string;
  temperature: number;
  timeoutMs: number;
};

export type Config = {
  telegramToken: string;
  allowedUserIds: Set<number>;
  tmpDir: string;
  ffmpegPath: string;
  audioSpeed: number;
  telegramMessageLimit: number;
  telegramSendDelayMs: number;
  stt: SttConfig;
  postprocessEnabled: boolean;
  llm?: LlmConfig;
};

const getRequiredEnv = (key: string): string => {
  const value = process.env[key];
  if (!value) {
    throw new Error(`Missing env var: ${key}`);
  }
  return value;
};

const getOptionalEnv = (key: string, fallback: string): string => {
  return process.env[key] ?? fallback;
};

const parseNumber = (key: string, fallback: number): number => {
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

const parseBoolean = (key: string, fallback: boolean): boolean => {
  const raw = process.env[key];
  if (!raw) {
    return fallback;
  }
  return raw === "true" || raw === "1";
};

const parseAllowedUserIds = (raw: string | undefined): Set<number> => {
  if (!raw) {
    return new Set<number>();
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

const config: Config = {
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

export default config;
