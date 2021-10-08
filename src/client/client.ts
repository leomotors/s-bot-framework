import { ActivityOptions, Client, Message, Intents } from "discord.js";
import chalk from "chalk";

import { sLogger as Logger } from "../logger/logger";
import { Response } from "../response/response";
import { Console } from "../console/console";
import { DataLoader } from "../data";

import { Version as FrameworkVersion } from "../config";

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
        response: Response[];
        console?: Console;
        loader: DataLoader[];
    };

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

        console.log(
            chalk.cyan("Starting S-Bot Framework ") +
                chalk.magenta(FrameworkVersion) +
                "✨✨"
        );

        // * Initialize Utility Classes
        this.utility = {
            response: [],
            loader: [],
        };

        Logger.startFile();

        const { token, activityRefreshInterval = 300 } = options;

        this.on("ready", () => {
            Logger.log(
                `=====> Logged in! Bot Mounted on ${this.user?.tag} <=====`,
                "SPECIAL",
                false
            );
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
        response.setClient(this);
        this.utility.response.push(response);
    }

    private response(msg: Message) {
        if (msg.author.id == this.user?.id) return;

        Logger.log(`Recieved Message from ${msg.author.tag}: ${msg.content}`);

        for (const response of this.utility.response) {
            if (response.isTrigger(msg.content)) {
                const reply = response.getReply();
                try {
                    if (reply.react) msg.react(reply.react);
                    if (reply.reply) msg.reply(reply.message);
                    else msg.channel.send(reply.message);
                    Logger.log(
                        `Replied ${msg.author.tag} with ${reply.message}`
                    );
                } catch (err) {
                    Logger.log(
                        `Error while responding to message : ${err}`,
                        "ERROR"
                    );
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
