import { ActivityOptions, Client, Message, Intents } from "discord.js";
import chalk from "chalk";
import dotenv from "dotenv";
dotenv.config();

import { sLogger as Logger } from "../logger/logger";
import { Response } from "../response/response";
import { Console } from "../console/console";
import { DataLoader } from "../data";
import { Voice } from "../voice/voice";

import { Version as FrameworkVersion } from "../config";

export interface MessageResponse {
    message: string;
    react?: string;
    reply?: boolean;
    audio?: boolean;
}

export interface SBotOptions {
    token?: string;
    activityRefreshInterval?: number;
}
export interface TTSOptions {
    prefix?: string;
    onJoin?: string;
}

interface InnerTTSOptions {
    express: boolean;
    prefix: string;
    onJoin?: string;
}

export class SBotClient {
    client: Client;
    get user() {
        return this.client.user;
    }

    private utility: {
        response: Response[];
        console?: Console;
        loader: DataLoader[];
    };

    constructor(options?: SBotOptions) {
        this.client = new Client({
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

        const {
            token = process.env.DISCORD_TOKEN,
            activityRefreshInterval = 300,
        } = options ?? {};

        this.client.on("ready", () => {
            Logger.log(
                `=====> Logged in! Bot Mounted on ${this.client.user?.tag} <=====`,
                "SPECIAL",
                false
            );
            this.setSelfActivity();
        });

        this.client.login(token);

        setInterval(() => {
            this.setSelfActivity();
        }, activityRefreshInterval * 1000);

        this.client.on("messageCreate", this.response.bind(this));
    }

    private state: {
        activity?: ActivityOptions;
    } = {};

    useActivity(activity: ActivityOptions) {
        const { type, name = "" } = activity;
        this.state.activity = activity;
        this.client.user?.setActivity(name, { type, name });
    }

    private setSelfActivity() {
        if (!this.state.activity) return;
        const { type, name = "" } = this.state.activity;
        this.client.user?.setActivity(name, { type, name });
    }

    useResponse(response: Response) {
        response.setClient(this);
        this.utility.response.push(response);
    }

    private response(msg: Message) {
        if (msg.author.id == this.client.user?.id) return;

        Logger.log(`Recieved Message from ${msg.author.tag}: ${msg.content}`);

        if (this.ttsOptions && !this.ttsOptions.express) {
            if (msg.content.toLowerCase().startsWith(this.ttsOptions.prefix)) {
                this.pursueUser(msg);
                return;
            }
        }

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

    // * VOICE SECTION

    private voice?: Voice;
    private ttsOptions?: InnerTTSOptions;

    useTTS(Options: TTSOptions) {
        this.ttsOptions = {
            prefix: Options.prefix ?? "__NOT_AVAILABLE__",
            express: !Options.prefix,
            onJoin: Options.onJoin,
        };
    }

    async pursueUser(msg: Message) {
        this.voice = new Voice(msg);
        const result = await this.voice.waitTillReady();
        if (!result) this.voice = undefined;
    }
}
