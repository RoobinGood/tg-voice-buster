import config from "./config";
import { createBot } from "./bot";
import { logInfo } from "./utils/logger";

const bot = createBot();

bot.start({
  onStart: () => {
    const allowedCount = config.allowedUserIds.size;
    const mode = allowedCount > 0 ? `allowlist: ${allowedCount}` : "allowlist: 0";
    logInfo("bot.start", { mode });
  },
});
