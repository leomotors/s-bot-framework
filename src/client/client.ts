import { ActivityOptions, Client, Message, Intents } from "discord.js";

import { sLogger } from "../logger";
import { Response } from "../response/response";
import { Console } from "../console/console";
import { DataLoader } from "../data";

export interface MessageResponse {
    message: string;
    react?: string;
    reply?: boolean;
}

export interface SBotOptions {
    token?: string;
    activityRefreshInterval?: number;
}

export class SBotClient extends Client {
    private utility: {
        logger: sLogger;
        response: Response[];
        console?: Console;
        loader: DataLoader[];
    };

    get log() {
        return this.utility.logger.log;
    }

    constructor(options: SBotOptions) {
        super({
            intents: [
                Intents.FLAGS.GUILDS,
                Intents.FLAGS.GUILD_MESSAGES,
                Intents.FLAGS.GUILD_MESSAGE_REACTIONS,
                Intents.FLAGS.GUILD_VOICE_STATES,
                Intents.FLAGS.DIRECT_MESSAGES,
                Intents.FLAGS.DIRECT_MESSAGE_REACTIONS,
            ],
        });

        // * Initialize Utility Classes
        this.utility = {
            logger: new sLogger(),
            response: [],
            loader: [],
        };

        const { token, activityRefreshInterval = 300 } = options;

        this.on("ready", () => {
            console.log(`Bot Mounted on ${this.user?.tag}`);
            this.setSelfActivity();
        });

        this.login(token);

        setInterval(() => {
            this.setSelfActivity();
        }, activityRefreshInterval * 1000);

        this.on("messageCreate", this.response);
    }

    private state: {
        activity?: ActivityOptions;
    } = {};

    useActivity(activity: ActivityOptions) {
        const { type, name = "" } = activity;
        this.state.activity = activity;
        this.user?.setActivity(name, { type, name });
    }

    private setSelfActivity() {
        if (!this.state.activity) return;
        const { type, name = "" } = this.state.activity;
        this.user?.setActivity(name, { type, name });
    }

    useResponse(response: Response) {
        this.utility.response.push(response);
    }

    private response(msg: Message) {
        if (msg.author.id == this.user?.id) return;

        for (const response of this.utility.response) {
            if (response.isTrigger(msg.content)) {
                const reply = response.getReply();
                try {
                    if (reply.react) msg.react(reply.react);
                    if (reply.reply) msg.reply(reply.message);
                    else msg.channel.send(reply.message);
                } catch (err) {
                    // TODO Log Error
                }
                return;
            }
        }
    }

    useConsole(console: Console) {
        this.utility.console = console;
    }

    useDataLoader(loader: DataLoader) {
        this.utility.loader.push(loader);
    }
}
