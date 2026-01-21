"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const config_1 = __importDefault(require("./config"));
const bot_1 = require("./bot");
const logger_1 = require("./utils/logger");
const bot = (0, bot_1.createBot)();
bot.start({
    onStart: () => {
        const allowedCount = config_1.default.allowedUserIds.size;
        const mode = allowedCount > 0 ? `allowlist: ${allowedCount}` : "allowlist: 0";
        (0, logger_1.logInfo)("bot.start", { mode });
    },
});
