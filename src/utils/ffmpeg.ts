import { spawn } from "node:child_process";
import { logError, logInfo } from "./logger";

const buildAtempoFilters = (speed: number): string[] => {
  const filters: string[] = [];
  let value = speed;

  while (value > 2) {
    filters.push("atempo=2");
    value /= 2;
  }

  while (value < 0.5) {
    filters.push("atempo=0.5");
    value *= 2;
  }

  if (Math.abs(value - 1) > 0.0001) {
    filters.push(`atempo=${value}`);
  }

  return filters;
};

const runProcess = (
  command: string,
  args: string[],
  requestId?: string,
): Promise<void> => {
  return new Promise((resolve, reject) => {
    const startedAt = Date.now();
    logInfo("ffmpeg.start", { command, args, requestId });
    const child = spawn(command, args, { stdio: ["ignore", "pipe", "pipe"] });
    let stderr = "";

    child.stderr.on("data", (chunk) => {
      stderr += chunk.toString();
    });

    child.on("error", (error) => {
      logError("ffmpeg.error", { command, args, requestId, error: error.message });
      reject(error);
    });

    child.on("close", (code) => {
      if (code === 0) {
        logInfo("ffmpeg.done", {
          command,
          args,
          requestId,
          durationMs: Date.now() - startedAt,
        });
        resolve();
        return;
      }
      const message = stderr.trim() || `ffmpeg exited with code ${code}`;
      logError("ffmpeg.error", { command, args, requestId, code, stderr: message });
      reject(new Error(message));
    });
  });
};

export const convertOggToMp3 = async (
  inputPath: string,
  outputPath: string,
  speed: number,
  ffmpegPath: string,
  requestId?: string,
): Promise<void> => {
  const args = ["-y", "-i", inputPath];
  const filters = buildAtempoFilters(speed);

  if (filters.length > 0) {
    args.push("-filter:a", filters.join(","));
  }

  args.push("-vn", "-ar", "44100", "-ac", "2", "-b:a", "192k", outputPath);

  await runProcess(ffmpegPath, args, requestId);
};
