import { ActivityOptions, Client, Message, Intents } from "discord.js";
import chalk from "chalk";
import dotenv from "dotenv";
dotenv.config();

import { sLogger as Logger } from "../logger/logger";
import { Response } from "../response/response";
import { Console } from "../console/console";
import { SOnDemand, VoiceOptions, DJOptions, SongOptions } from "./clientVoice";

import { Version as FrameworkVersion } from "../config";
import { VoiceControl, VoiceValidateResult } from "../voice";
import { checkPrefix } from "../utils/string";
import { ActivityLoader } from "../data/activityLoader";
import { Song } from "../data/songLoader";
import { lowerBoundLinear } from "../utils/algorithm";

export interface MessageResponse {
    message: string;
    react?: string;
    reply?: boolean;
    audio?: boolean;
    refIndex: string;
}

export interface SBotOptions {
    token?: string;
    activityRefreshInterval?: number;
    logLocation?: string | null;
    ignorePrivacy?: boolean;
}

export class SBotClient {
    client: Client;
    get user() {
        return this.client.user;
    }

    private utility: {
        response: Response[];
        console?: Console;
        activityLoader?: ActivityLoader;
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
            partials: ["CHANNEL"],
        });

        console.log(
            chalk.cyan("Starting S-Bot Framework ") +
                chalk.magenta(FrameworkVersion) +
                "✨✨"
        );

        // * Initialize Utility Classes
        this.utility = {
            response: [],
        };

        const {
            token = process.env.DISCORD_TOKEN,
            activityRefreshInterval = 120,
            logLocation,
        } = options ?? {};

        Logger.startFile(logLocation);

        this.client.on("ready", () => {
            Logger.log(
                `=====> Logged in! Bot Mounted on ${this.client.user?.tag} <=====`,
                "SPECIAL",
                false
            );
            this.setSelfActivity();
        });

        this.client.login(token);

        setInterval(
            (() => {
                this.setSelfActivity();
            }).bind(this),
            activityRefreshInterval * 1000
        );

        this.client.on("messageCreate", this.response.bind(this));
    }

    private props: {
        computedActivity?: ActivityOptions;
    } = {};

    useComputedActivity(activity: ActivityOptions) {
        const { type, name = "" } = activity;
        this.props.computedActivity = activity;
        this.client.user?.setActivity(name, { type, name });
    }

    useActivities(loader: ActivityLoader) {
        this.utility.activityLoader = loader;
    }

    private setSelfActivity(index?: number) {
        const loader = this.utility.activityLoader;
        if (!this.props.computedActivity && !loader?.length) return;

        if (index === undefined) {
            index = Math.floor(
                Math.random() *
                    (Number(!!loader?.length) +
                        Number(!!this.utility.activityLoader))
            );
        }

        const selectedActivity =
            loader?.getData()[index] ?? this.props.computedActivity;

        if (selectedActivity) {
            const { type, name = "" } = selectedActivity;
            this.client.user?.setActivity(name, { type, name });
        }
    }

    useResponse(response: Response) {
        response.setClient(this);
        this.utility.response.push(response);
    }

    private response(msg: Message) {
        if (msg.author.id == this.client.user?.id) return;

        if (msg.author.bot) return;

        Logger.log(`Recieved Message from ${msg.author.tag}: ${msg.content}`);

        // * SOnDemand Only Part
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

        // * DJ Part
        if (
            this.djOptions &&
            checkPrefix(msg.content, this.djOptions.prefixes)
        ) {
            this.requestSong(msg);
            return;
        }

        // * Registered Response Part
        for (const response of this.utility.response) {
            if (response.isTrigger(msg.content)) {
                const reply = response.getReply();
                try {
                    if (reply.react) msg.react(reply.react);
                    if (reply.reply) msg.reply(reply.message);
                    else msg.channel.send(reply.message);
                    if (reply.audio) this.ttsJutsu(msg, reply.message);

                    const refInd = reply.refIndex;
                    Logger.log(
                        `Replied ${msg.author.tag} with ${reply.message}${
                            refInd ? ` (${refInd})` : ""
                        }`
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

    /// * VOICE CONTROL SECTION ///

    private voiceOptions?: VoiceOptions;
    private voiceCtrl?: VoiceControl;

    useVoice(options: VoiceOptions) {
        this.voiceOptions = options;
    }

    private async ttsJutsu(msg: Message, content: string) {
        if (!this.voiceOptions?.jutsu) return;

        if (this.voiceOptions.jutsu == "SOnDemand") {
            if (!this.voiceCtrl?.isSameChannel(msg.member?.voice.channel)) {
                return;
            }
            if (this.voiceCtrl) {
                this.voiceCtrl.speak(content);
                return;
            }
        }

        if (this.voiceOptions.jutsu == "CorgiSwift") {
            this.corgiSwiftJutsu(msg, content);
            return;
        }
    }

    // TODO Check if already joined
    private async sodJoin(msg: Message) {
        const voiceOptions = this.voiceOptions! as SOnDemand;
        try {
            this.voiceCtrl = new VoiceControl(
                msg,
                (() => {
                    this.voiceCtrl = undefined;
                }).bind(this)
            );
            await this.voiceCtrl.waitTillReady("SOD Mode");
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
                        case VoiceValidateResult.NOT_JOINABLE:
                            return messages.not_joinable;
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

    private async sodLeave(msg: Message) {
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

        this.voiceCtrl?.destruct();
    }

    private corgiSwiftQueue: { msg: Message; content: string }[] = [];
    private async corgiSwiftJutsu(msg: Message, content: string) {
        if (VoiceControl.validateUser(msg)) return;

        const notRunning = !this.corgiSwiftQueue.length;

        this.corgiSwiftQueue.push({ msg, content });
        if (notRunning) this.corgiSwiftClearQueue();
    }

    private async corgiSwiftClearQueue() {
        if (!this.corgiSwiftQueue.length) return;

        const { msg } = this.corgiSwiftQueue[0];

        const targetVoiceChannel = msg.member?.voice.channel;
        if (!targetVoiceChannel?.joinable) {
            // * Users no longer in VC or VC is not joinable
            this.corgiSwiftQueue.shift();
            this.corgiSwiftClearQueue();
            return;
        }

        try {
            this.voiceCtrl = new VoiceControl(
                msg,
                (() => {
                    this.voiceCtrl = undefined;
                }).bind(this)
            );
            await this.voiceCtrl.waitTillReady("CorgiSwift術 Mode");

            while (this.corgiSwiftQueue.length) {
                const words = this.corgiSwiftQueue[0];
                if (
                    this.voiceCtrl.isSameChannel(
                        words.msg.member?.voice.channel
                    )
                ) {
                    await this.voiceCtrl.speak(words.content);
                    this.corgiSwiftQueue.shift();
                } else {
                    this.voiceCtrl.destruct();
                    this.corgiSwiftClearQueue();
                    return;
                }
            }

            this.voiceCtrl?.destruct();
        } catch (err) {
            Logger.log(`CorgiSwift術 Failed: ${err}`);
            this.voiceCtrl?.destruct();
            this.corgiSwiftQueue.shift();
            this.corgiSwiftClearQueue();
        }
    }

    /// * MUSIC SECTION * ///

    private songOptions?: SongOptions[];
    private djOptions?: DJOptions;
    useDJ(SongOptions: SongOptions[], Options: DJOptions) {
        this.songOptions = SongOptions;
        this.djOptions = Options;
    }

    async requestSong(msg: Message) {
        let totalLength = 0;
        const allSongs: Song[] = [];
        const breakpoints = [0];
        this.songOptions!.forEach((so) => {
            totalLength += so.loader.length;
            breakpoints.push(breakpoints.at(-1)! + so.loader.length);
            allSongs.push(...so.loader.getData());
        });

        // TODO Add Search
        const selectedIndex = Math.floor(Math.random() * totalLength);

        const selectedSong = allSongs[selectedIndex];
        const selectedCategory =
            this.songOptions![lowerBoundLinear(breakpoints, selectedIndex)];
        const category = selectedCategory.category;
        const onPlay = selectedCategory.onPlay;

        this.corgiPlaySong(msg, selectedSong, category);

        const message = onPlay.replace(
            "{song_name}",
            selectedSong.name ?? "???"
        );

        if (this.djOptions!.reply) msg.reply(message);
        else msg.channel.send(message);
    }

    // TODO Make Play Song compatible with SOD

    private async corgiPlaySong(msg: Message, song: Song, category: string) {
        try {
            this.voiceCtrl = new VoiceControl(
                msg,
                (() => {
                    this.voiceCtrl = undefined;
                }).bind(this)
            );
            await this.voiceCtrl.waitTillReady("🎶🎶 DJCorgi Mode ✨💛");
            Logger.log(
                `[DJCorgi] Playing ${song.name} in category of ${category}`
            );
            await this.voiceCtrl.playSong(song.url, song.name);
            this.voiceCtrl?.destruct();
        } catch (err) {
            Logger.log(`DJCorgi Music Deliwry Mission Failed: ${err}`);
            this.voiceCtrl?.destruct();
        }
    }
}
