import axios from "axios";
import FormData from "form-data";
import fs from "node:fs";
import { SpeechToTextService } from "./speechToText";
import { logError, logInfo } from "../utils/logger";

type OpenAICompatibleSpeechToTextConfig = {
  apiUrl: string;
  apiKey: string;
  model: string;
  responseFormat: string;
  temperature: number;
  language: string;
  timeoutMs: number;
};

export class OpenAICompatibleSpeechToText implements SpeechToTextService {
  private readonly config: OpenAICompatibleSpeechToTextConfig;

  constructor(config: OpenAICompatibleSpeechToTextConfig) {
    this.config = config;
  }

  async transcribe(audioPath: string, requestId?: string): Promise<string> {
    const form = new FormData();
    form.append("file", fs.createReadStream(audioPath), {
      filename: "audio.mp3",
      contentType: "audio/mpeg",
    });
    form.append("model", this.config.model);
    form.append("response_format", this.config.responseFormat);
    form.append("temperature", this.config.temperature.toString());
    form.append("language", this.config.language);

    const startedAt = Date.now();
    logInfo("stt.request.start", {
      requestId,
      apiUrl: this.config.apiUrl,
      model: this.config.model,
      responseFormat: this.config.responseFormat,
      language: this.config.language,
    });

    let response;
    try {
      response = await axios.post<string | { text?: string }>(
        this.config.apiUrl,
        form,
        {
          headers: {
            Authorization: `Bearer ${this.config.apiKey}`,
            ...form.getHeaders(),
          },
          timeout: this.config.timeoutMs,
        },
      );
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      logError("stt.request.error", {
        requestId,
        durationMs: Date.now() - startedAt,
        error: message,
      });
      throw error;
    }

    logInfo("stt.request.done", {
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
