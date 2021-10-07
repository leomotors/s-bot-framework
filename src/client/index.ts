import { ActivityOptions, Client, Intents } from "discord.js";

import { sLogger } from "../logger";

export interface SBotOptions {
  token: string;
  activityRefreshInterval?: number;
}

export class SBotClient extends Client {
  private utility: {
    logger: sLogger;
  };

  private get log() {
    return this.utility.logger.log;
  }

  constructor(options: SBotOptions) {
    super({
      intents: [
        Intents.FLAGS.GUILDS,
        Intents.FLAGS.GUILD_MESSAGES,
        Intents.FLAGS.GUILD_MESSAGE_REACTIONS,
        Intents.FLAGS.GUILD_VOICE_STATES,
        Intents.FLAGS.GUILD_PRESENCES,
        Intents.FLAGS.DIRECT_MESSAGES,
        Intents.FLAGS.DIRECT_MESSAGE_REACTIONS,
      ],
    });

    // * Initialize Utility Classes
    this.utility = {
      logger: new sLogger(),
    };

    const { token, activityRefreshInterval = 300 } = options;

    this.on("ready", () => {
      console.log(`Bot Mounted on ${this.user?.tag}`);
    });

    this.login(token);

    setInterval(() => {
      if (!this.state.activity) return;
      const { type, name = "" } = this.state.activity;
      this.user?.setActivity(name, { type, name });
    }, activityRefreshInterval);
  }

  private state: {
    activity?: ActivityOptions;
  } = {};

  useActivity(activity: ActivityOptions) {
    const { type, name = "" } = activity;
    this.state.activity = activity;
    this.user?.setActivity(name, { type, name });
  }
}
