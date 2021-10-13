import { ActivityOptions, Client, Message, Intents } from "discord.js";
import chalk from "chalk";
import dotenv from "dotenv";
dotenv.config();

import { sLogger as Logger } from "../logger/logger";
import { Response } from "../response/response";
import { Console } from "../console/console";
import { DataLoader } from "../data";

import { Version as FrameworkVersion } from "../config";
import { VoiceControl, VoiceValidateResult } from "../voice";
import { checkPrefix } from "../utils/string";

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

        // TODO Allow disabling Log to files
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

        if (this.voiceOptions?.jutsu == "SOnDemand") {
            if (checkPrefix(msg.content, this.voiceOptions.prefix.join)) {
                this.sodJoin(msg);
                return;
            }
            if (checkPrefix(msg.content, this.voiceOptions.prefix.leave)) {
                this.sodLeave(msg);
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
                    if (reply.audio) this.ttsJutsu(msg, reply.message);
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

    // * VOICE CONTROL SECTION

    voiceOptions?: VoiceOptions;
    voiceCtrl?: VoiceControl;

    useVoice(options: VoiceOptions) {
        this.voiceOptions = options;
    }

    async ttsJutsu(msg: Message, content: string) {
        if (!this.voiceOptions?.jutsu) return;

        if (!this.voiceCtrl?.isSameChannel(msg.member?.voice.channel)) {
            return;
        }

        if (this.voiceOptions.jutsu == "SOnDemand") {
            if (this.voiceCtrl) {
                this.voiceCtrl.speak(content);
            }
        }
    }

    // TODO Check if already joined
    async sodJoin(msg: Message) {
        const voiceOptions = this.voiceOptions! as SOnDemand;
        try {
            this.voiceCtrl = new VoiceControl(
                msg,
                (() => {
                    this.voiceCtrl = undefined;
                }).bind(this)
            );
            await this.voiceCtrl.waitTillReady();
            if (voiceOptions.onJoin) {
                await this.voiceCtrl.speak(voiceOptions.onJoin);
            }
        } catch (err) {
            if (voiceOptions.fallback?.join_fail?.message) {
                const message = (() => {
                    const messages = voiceOptions.fallback.join_fail.message;
                    switch (err) {
                        case VoiceValidateResult.NO_CHANNEL:
                            return messages.no_channel;
                        case VoiceValidateResult.STAGE_CHANNEL:
                            return messages.stage_channel;
                        default:
                            return messages.internal;
                    }
                })();

                if (!message) return;

                if (voiceOptions.fallback.join_fail.reply) msg.reply(message);
                else msg.channel.send(message);
            }
        }
    }

    async sodLeave(msg: Message) {
        const voiceOptions = this.voiceOptions! as SOnDemand;

        if (
            !this.voiceCtrl?.isSameChannel(msg.member?.voice.channel) &&
            voiceOptions.rules?.onsite_leave
        ) {
            const message = voiceOptions.fallback?.onsite_leave?.message;
            if (message) {
                if (voiceOptions.fallback?.onsite_leave?.reply)
                    msg.reply(message);
                else msg.channel.send(message);
            }

            return;
        }
    }
}

interface CorgiSwiftJutsu {
    jutsu: "CorgiSwift";
    fallback?: {};
}

interface SOnDemand {
    jutsu: "SOnDemand";
    prefix: {
        join: string[];
        leave: string[];
    };
    onJoin?: string;
    fallback?: {
        join_fail?: {
            message?: {
                no_channel?: string;
                stage_channel?: string;
                internal?: string;
            };
            reply?: boolean;
        };
        already_join?: {
            message?: string;
            reply?: boolean;
        };
        onsite_leave?: {
            message?: string;
            reply?: boolean;
        };
    };
    rules?: {
        onsite_leave: boolean;
    };
}

export type VoiceOptions = CorgiSwiftJutsu | SOnDemand;
