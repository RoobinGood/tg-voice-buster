import axios from "axios";
import { TextPostProcessor } from "./textPostProcess";
import { logError, logInfo } from "../utils/logger";

type OpenAICompatibleTextPostProcessConfig = {
  apiUrl: string;
  apiKey: string;
  model: string;
  temperature: number;
  timeoutMs: number;
};

const SYSTEM_PROMPT = `
Ты редактор транскрипции. Восстанови знаки препинания, делай абзацы по смыслу и при необходимости меняй регистр.

Правила:
- Разрешены только: пунктуация, абзацы, регистр.
- Запрещено: менять слова, исправлять орфографию или грамматику, заменять на синонимы, добавлять или удалять слова, менять порядок слов.
- Если сомневаешься, оставляй как есть.

Формат:
- Вход всегда внутри тега <text>...</text>.
- Выход верни только внутри тега <result>...</result>, без пояснений.

Пример
<text>
мы вчера были в москве потом поехали домой ну я думаю что это правда но посмотрим
</text>
<result>
Мы вчера были в Москве, потом поехали домой.

Ну, я думаю, что это правда. Но посмотрим.
</result>
`

export class OpenAICompatibleTextPostProcess implements TextPostProcessor {
  private readonly config: OpenAICompatibleTextPostProcessConfig;

  constructor(config: OpenAICompatibleTextPostProcessConfig) {
    this.config = config;
  }

  async process(text: string, requestId?: string): Promise<string> {
    const startedAt = Date.now();
    logInfo("llm.request.start", {
      requestId,
      apiUrl: this.config.apiUrl,
      model: this.config.model,
    });

    let response;
    try {
      response = await axios.post(
        this.config.apiUrl,
        {
          model: this.config.model,
          temperature: this.config.temperature,
          messages: [
            { role: "system", content: SYSTEM_PROMPT },
            { role: "user", content: `<text>\n${text}\n</text>` },
          ],
        },
        {
          headers: {
            Authorization: `Bearer ${this.config.apiKey}`,
            "Content-Type": "application/json",
          },
          timeout: this.config.timeoutMs,
        },
      );
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      logError("llm.request.error", {
        requestId,
        durationMs: Date.now() - startedAt,
        error: message,
      });
      throw error;
    }

    logInfo("llm.request.done", {
      requestId,
      status: response.status,
      durationMs: Date.now() - startedAt,
    });

    const content: unknown =
      response.data?.choices?.[0]?.message?.content ??
      response.data?.output_text ??
      response.data?.text;

    if (typeof content === "string" && content.trim().length > 0) {
      const trimmed = content.trim();
      const match = trimmed.match(/<result>([\s\S]*?)<\/result>/i);
      if (match) {
        return match[1].trim();
      }
      return trimmed;
    }

    throw new Error("Unexpected post-processing response");
  }
}
