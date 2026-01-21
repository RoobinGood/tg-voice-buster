"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.createBot = void 0;
const grammy_1 = require("grammy");
const files_1 = require("@grammyjs/files");
const promises_1 = __importDefault(require("node:fs/promises"));
const node_path_1 = __importDefault(require("node:path"));
const node_crypto_1 = require("node:crypto");
const config_1 = __importDefault(require("./config"));
const openaiSpeechToText_1 = require("./services/openaiSpeechToText");
const openaiTextPostProcess_1 = require("./services/openaiTextPostProcess");
const ffmpeg_1 = require("./utils/ffmpeg");
const logger_1 = require("./utils/logger");
const textSplit_1 = require("./utils/textSplit");
const ensureTmpDir = async () => {
    await promises_1.default.mkdir(config_1.default.tmpDir, { recursive: true });
};
const safeUnlink = async (filePath) => {
    try {
        await promises_1.default.rm(filePath, { force: true });
    }
    catch {
        return;
    }
};
const getErrorMessage = (error) => {
    if (error instanceof Error) {
        return error.message || "Unknown error";
    }
    if (typeof error === "string") {
        return error;
    }
    return "Unknown error";
};
const isAllowed = (ctx) => {
    const userId = ctx.from?.id;
    if (!userId) {
        return false;
    }
    return config_1.default.allowedUserIds.has(userId);
};
const getUserLogData = (ctx) => {
    return {
        userId: ctx.from?.id ?? "unknown",
        username: ctx.from?.username ?? "unknown",
    };
};
const sleep = (ms) => {
    return new Promise((resolve) => setTimeout(resolve, ms));
};
const sendSplitMessages = async (ctx, text, replyToMessageId) => {
    const limit = config_1.default.telegramMessageLimit;
    const delayMs = config_1.default.telegramSendDelayMs;
    let chunks = (0, textSplit_1.splitTextForTelegram)(text, limit);
    if (chunks.length > 1) {
        const maxPrefixLength = `${chunks.length}/${chunks.length}\n`.length;
        const effectiveLimit = limit - maxPrefixLength;
        chunks = (0, textSplit_1.splitTextForTelegram)(text, effectiveLimit);
    }
    const prefixedChunks = (0, textSplit_1.addPrefixToChunks)(chunks);
    for (let i = 0; i < prefixedChunks.length; i++) {
        const chunk = prefixedChunks[i];
        const options = i === 0 && replyToMessageId
            ? { reply_to_message_id: replyToMessageId }
            : {};
        await ctx.reply(chunk, options);
        if (i < prefixedChunks.length - 1 && delayMs > 0) {
            await sleep(delayMs);
        }
    }
};
const createBot = () => {
    const bot = new grammy_1.Bot(config_1.default.telegramToken);
    bot.api.config.use((0, files_1.hydrateFiles)(bot.token));
    const speechToText = new openaiSpeechToText_1.OpenAICompatibleSpeechToText(config_1.default.stt);
    const postProcessor = config_1.default.postprocessEnabled && config_1.default.llm
        ? new openaiTextPostProcess_1.OpenAICompatibleTextPostProcess(config_1.default.llm)
        : undefined;
    bot.command("start", async (ctx) => {
        if (!isAllowed(ctx)) {
            return;
        }
        await ctx.reply("Пришлите голосовое сообщение — я переведу его в текст.");
    });
    bot.on("message:voice", async (ctx) => {
        if (!isAllowed(ctx)) {
            return;
        }
        const userLog = getUserLogData(ctx);
        const userId = ctx.from?.id ?? "unknown";
        const messageId = ctx.msg.message_id;
        const requestId = (0, node_crypto_1.randomUUID)();
        const baseLog = { ...userLog, requestId, messageId };
        const filePrefix = `${userId}_${messageId}`;
        const oggPath = node_path_1.default.join(config_1.default.tmpDir, `${filePrefix}.ogg`);
        const mp3Path = node_path_1.default.join(config_1.default.tmpDir, `${filePrefix}.mp3`);
        try {
            (0, logger_1.logInfo)("message.voice.received", baseLog);
            await ensureTmpDir();
            const file = await ctx.getFile();
            (0, logger_1.logInfo)("file.download.start", { ...baseLog, filePath: oggPath });
            await file.download(oggPath);
            (0, logger_1.logInfo)("file.download.done", { ...baseLog, filePath: oggPath });
            (0, logger_1.logInfo)("ffmpeg.convert.start", {
                ...baseLog,
                inputPath: oggPath,
                outputPath: mp3Path,
                speed: config_1.default.audioSpeed,
            });
            await (0, ffmpeg_1.convertOggToMp3)(oggPath, mp3Path, config_1.default.audioSpeed, config_1.default.ffmpegPath, requestId);
            (0, logger_1.logInfo)("ffmpeg.convert.done", {
                ...baseLog,
                inputPath: oggPath,
                outputPath: mp3Path,
            });
            (0, logger_1.logInfo)("stt.transcribe.start", baseLog);
            const rawText = await speechToText.transcribe(mp3Path, requestId);
            (0, logger_1.logInfo)("stt.transcribe.done", baseLog);
            const text = rawText.trim();
            let finalText = text;
            if (postProcessor) {
                (0, logger_1.logInfo)("llm.postprocess.start", baseLog);
                finalText = await postProcessor.process(text, requestId);
                (0, logger_1.logInfo)("llm.postprocess.done", baseLog);
            }
            await sendSplitMessages(ctx, finalText, messageId);
            (0, logger_1.logInfo)("message.reply.sent", { ...baseLog, textLength: finalText.length });
        }
        catch (error) {
            (0, logger_1.logError)("message.voice.error", {
                ...baseLog,
                error: getErrorMessage(error),
            });
            await ctx.reply(getErrorMessage(error), { reply_to_message_id: messageId });
        }
        finally {
            await safeUnlink(oggPath);
            await safeUnlink(mp3Path);
        }
    });
    bot.on("message", async (ctx) => {
        if (!isAllowed(ctx)) {
            return;
        }
        if (ctx.msg.voice) {
            return;
        }
        if (ctx.msg.text?.startsWith("/start")) {
            return;
        }
        await ctx.reply("Пожалуйста, отправьте голосовое сообщение.");
    });
    return bot;
};
exports.createBot = createBot;
