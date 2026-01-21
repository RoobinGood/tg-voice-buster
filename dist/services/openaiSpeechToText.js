"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.OpenAICompatibleSpeechToText = void 0;
const axios_1 = __importDefault(require("axios"));
const form_data_1 = __importDefault(require("form-data"));
const node_fs_1 = __importDefault(require("node:fs"));
const logger_1 = require("../utils/logger");
class OpenAICompatibleSpeechToText {
    constructor(config) {
        this.config = config;
    }
    async transcribe(audioPath, requestId) {
        const form = new form_data_1.default();
        form.append("file", node_fs_1.default.createReadStream(audioPath), {
            filename: "audio.mp3",
            contentType: "audio/mpeg",
        });
        form.append("model", this.config.model);
        form.append("response_format", this.config.responseFormat);
        form.append("temperature", this.config.temperature.toString());
        form.append("language", this.config.language);
        const startedAt = Date.now();
        (0, logger_1.logInfo)("stt.request.start", {
            requestId,
            apiUrl: this.config.apiUrl,
            model: this.config.model,
            responseFormat: this.config.responseFormat,
            language: this.config.language,
        });
        let response;
        try {
            response = await axios_1.default.post(this.config.apiUrl, form, {
                headers: {
                    Authorization: `Bearer ${this.config.apiKey}`,
                    ...form.getHeaders(),
                },
                timeout: this.config.timeoutMs,
            });
        }
        catch (error) {
            const message = error instanceof Error ? error.message : String(error);
            (0, logger_1.logError)("stt.request.error", {
                requestId,
                durationMs: Date.now() - startedAt,
                error: message,
            });
            throw error;
        }
        (0, logger_1.logInfo)("stt.request.done", {
            requestId,
            status: response.status,
            durationMs: Date.now() - startedAt,
        });
        if (typeof response.data === "string") {
            return response.data;
        }
        if (response.data?.text) {
            return response.data.text;
        }
        throw new Error("Unexpected transcription response");
    }
}
exports.OpenAICompatibleSpeechToText = OpenAICompatibleSpeechToText;
