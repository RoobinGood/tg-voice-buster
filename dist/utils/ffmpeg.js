"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.convertOggToMp3 = void 0;
const node_child_process_1 = require("node:child_process");
const logger_1 = require("./logger");
const buildAtempoFilters = (speed) => {
    const filters = [];
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
const runProcess = (command, args, requestId) => {
    return new Promise((resolve, reject) => {
        const startedAt = Date.now();
        (0, logger_1.logInfo)("ffmpeg.start", { command, args, requestId });
        const child = (0, node_child_process_1.spawn)(command, args, { stdio: ["ignore", "pipe", "pipe"] });
        let stderr = "";
        child.stderr.on("data", (chunk) => {
            stderr += chunk.toString();
        });
        child.on("error", (error) => {
            (0, logger_1.logError)("ffmpeg.error", { command, args, requestId, error: error.message });
            reject(error);
        });
        child.on("close", (code) => {
            if (code === 0) {
                (0, logger_1.logInfo)("ffmpeg.done", {
                    command,
                    args,
                    requestId,
                    durationMs: Date.now() - startedAt,
                });
                resolve();
                return;
            }
            const message = stderr.trim() || `ffmpeg exited with code ${code}`;
            (0, logger_1.logError)("ffmpeg.error", { command, args, requestId, code, stderr: message });
            reject(new Error(message));
        });
    });
};
const convertOggToMp3 = async (inputPath, outputPath, speed, ffmpegPath, requestId) => {
    const args = ["-y", "-i", inputPath];
    const filters = buildAtempoFilters(speed);
    if (filters.length > 0) {
        args.push("-filter:a", filters.join(","));
    }
    args.push("-vn", "-ar", "44100", "-ac", "2", "-b:a", "192k", outputPath);
    await runProcess(ffmpegPath, args, requestId);
};
exports.convertOggToMp3 = convertOggToMp3;
