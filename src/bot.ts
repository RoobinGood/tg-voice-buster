import { Bot, Context } from "grammy";
import { FileFlavor, hydrateFiles } from "@grammyjs/files";
import fs from "node:fs/promises";
import path from "node:path";
import { randomUUID } from "node:crypto";
import config from "./config";
import { OpenAICompatibleSpeechToText } from "./services/openaiSpeechToText";
import { OpenAICompatibleTextPostProcess } from "./services/openaiTextPostProcess";
import { convertOggToMp3 } from "./utils/ffmpeg";
import { logError, logInfo } from "./utils/logger";

type BotContext = FileFlavor<Context>;

const ensureTmpDir = async (): Promise<void> => {
  await fs.mkdir(config.tmpDir, { recursive: true });
};

const safeUnlink = async (filePath: string): Promise<void> => {
  try {
    await fs.rm(filePath, { force: true });
  } catch {
    return;
  }
};

const getErrorMessage = (error: unknown): string => {
  if (error instanceof Error) {
    return error.message || "Unknown error";
  }
  if (typeof error === "string") {
    return error;
  }
  return "Unknown error";
};

const isAllowed = (ctx: BotContext): boolean => {
  const userId = ctx.from?.id;
  if (!userId) {
    return false;
  }
  return config.allowedUserIds.has(userId);
};

const getUserLogData = (ctx: BotContext): { userId: number | "unknown"; username: string } => {
  return {
    userId: ctx.from?.id ?? "unknown",
    username: ctx.from?.username ?? "unknown",
  };
};

export const createBot = (): Bot<BotContext> => {
  const bot = new Bot<BotContext>(config.telegramToken);
  bot.api.config.use(hydrateFiles(bot.token));

  const speechToText = new OpenAICompatibleSpeechToText(config.stt);
  const postProcessor = config.postprocessEnabled && config.llm
    ? new OpenAICompatibleTextPostProcess(config.llm)
    : undefined;

  bot.command("start", async (ctx) => {
    if (!isAllowed(ctx)) {
      return;
    }
    await ctx.reply(
      "Пришлите голосовое сообщение — я переведу его в текст.",
    );
  });

  bot.on("message:voice", async (ctx) => {
    if (!isAllowed(ctx)) {
      return;
    }

    const userLog = getUserLogData(ctx);
    const userId = ctx.from?.id ?? "unknown";
    const messageId = ctx.msg.message_id;
    const requestId = randomUUID();
    const baseLog = { ...userLog, requestId, messageId };
    const filePrefix = `${userId}_${messageId}`;
    const oggPath = path.join(config.tmpDir, `${filePrefix}.ogg`);
    const mp3Path = path.join(config.tmpDir, `${filePrefix}.mp3`);

    try {
      logInfo("message.voice.received", baseLog);
      await ensureTmpDir();
      const file = await ctx.getFile();
      logInfo("file.download.start", { ...baseLog, filePath: oggPath });
      await file.download(oggPath);
      logInfo("file.download.done", { ...baseLog, filePath: oggPath });
      logInfo("ffmpeg.convert.start", {
        ...baseLog,
        inputPath: oggPath,
        outputPath: mp3Path,
        speed: config.audioSpeed,
      });
      await convertOggToMp3(
        oggPath,
        mp3Path,
        config.audioSpeed,
        config.ffmpegPath,
        requestId,
      );
      logInfo("ffmpeg.convert.done", {
        ...baseLog,
        inputPath: oggPath,
        outputPath: mp3Path,
      });
      logInfo("stt.transcribe.start", baseLog);
      const rawText = await speechToText.transcribe(mp3Path, requestId);
      logInfo("stt.transcribe.done", baseLog);
      const text = rawText.trim();
      let finalText = text;
      if (postProcessor) {
        logInfo("llm.postprocess.start", baseLog);
        finalText = await postProcessor.process(text, requestId);
        logInfo("llm.postprocess.done", baseLog);
      }

      await ctx.reply(finalText, { reply_to_message_id: messageId });
      logInfo("message.reply.sent", { ...baseLog, textLength: finalText.length });
    } catch (error) {
      logError("message.voice.error", {
        ...baseLog,
        error: getErrorMessage(error),
      });
      await ctx.reply(getErrorMessage(error), { reply_to_message_id: messageId });
    } finally {
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
