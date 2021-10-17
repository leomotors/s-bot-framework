import {
    ActivityOptions,
    Client,
    Message,
    Intents,
    MessageEmbed,
} from "discord.js";
import chalk from "chalk";
import ytdl from "ytdl-core";

import dotenv from "dotenv";
dotenv.config();

import { sLogger as Logger } from "../logger/logger";
import { Response } from "../response/response";
import { Console } from "../console/console";
import { VoiceOptions, DJCommands, SongOptions } from "./clientVoice";

import { Version as FrameworkVersion } from "../config";
import { VoiceControl, VoiceValidateResult } from "../voice";
import { checkPrefix, shorten, trim } from "../utils/string";
import { ActivityLoader } from "../data/activityLoader";
import { Song } from "../data/songLoader";
import { lowerBoundLinear } from "../utils/algorithm";
import { durationFormat, timems } from "../utils";
import { corgiQueue } from ".";

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

        const start = performance.now();

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
                `=====> Logged in! Bot Mounted on ${
                    this.client.user?.tag
                } (Took ${timems(start)}) <=====`,
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

        // * DJ Corgi Part
        if (
            this.djCommands &&
            checkPrefix(msg.content, this.djCommands.play.prefixes)
        ) {
            this.requestSong(msg);
            return;
        }

        if (this.djCommands?.skip) {
            if (checkPrefix(msg.content, this.djCommands.skip.prefixes)) {
                if (this.voiceCtrl) {
                    this.voiceCtrl.forceSkip();
                    this.djCommands.skip.react &&
                        msg.react(this.djCommands.skip.react);
                } else {
                    this.djCommands.skip.already_empty &&
                        msg.reply(this.djCommands.skip.already_empty);
                }
            }
        }

        if (this.djCommands?.clear) {
            if (checkPrefix(msg.content, this.djCommands.clear.prefixes)) {
                if (this.voiceCtrl) {
                    this.corgiSwiftQueue = [];
                    this.voiceCtrl.forceSkip();
                    this.djCommands.clear.react &&
                        msg.react(this.djCommands.clear.react);
                } else {
                    this.djCommands.clear.already_empty &&
                        msg.reply(this.djCommands.clear.already_empty);
                }
            }
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

        if (this.voiceOptions.jutsu == "CorgiSwift") {
            this.corgiSwiftJutsu(msg, content);
            return;
        }
    }

    private corgiSwiftQueue: corgiQueue[] = [];
    private async corgiSwiftJutsu(msg: Message, content: string) {
        if (VoiceControl.validateUser(msg)) return;

        // * Ignore TTS if Music is on Queue
        if (this.corgiSwiftQueue.filter((q) => q.type == "SONG").length) return;

        const notRunning = !this.corgiSwiftQueue.length;

        this.corgiSwiftQueue.push({ msg, type: "TTS", content });
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
                const frontier = this.corgiSwiftQueue[0];
                if (
                    this.voiceCtrl.isSameChannel(
                        frontier.msg.member?.voice.channel
                    )
                ) {
                    if (frontier.type == "TTS")
                        await this.voiceCtrl.speak(frontier.content);
                    else
                        await this.corgiPlaySong(
                            msg,
                            frontier.song,
                            frontier.category
                        );
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

    private printSongsList(songs: { index: number; song: Song }[]): string {
        return songs.map((s) => `#${s.index} : ${s.song.name}`).join("\n");
    }

    private songOptions?: SongOptions[];
    private djCommands?: DJCommands;
    useDJ(SongOptions: SongOptions[], Options: DJCommands) {
        this.songOptions = SongOptions;
        this.djCommands = Options;
    }

    async requestSong(msg: Message) {
        // * Validate User
        const fallbackMsg = this.voiceOptions?.fallback;
        let failMsg: string | undefined;

        const validateRes = VoiceControl.validateUser(msg);
        switch (validateRes) {
            case VoiceValidateResult.NOT_JOINABLE:
                failMsg = fallbackMsg?.not_joinable;
                break;
            case VoiceValidateResult.NO_CHANNEL:
                failMsg = fallbackMsg?.no_channel;
                break;
            case VoiceValidateResult.STAGE_CHANNEL:
                failMsg = fallbackMsg?.stage_channel;
                break;
        }

        if (validateRes) {
            if (failMsg) {
                if (fallbackMsg!.reply && !msg.deleted) msg.reply(failMsg);
                else msg.channel.send(failMsg);
            }
            return;
        }

        // * Prepare Music Data
        let totalLength = 0;
        const allSongs: Song[] = [];
        const breakpoints = [0];
        this.songOptions!.forEach((so) => {
            totalLength += so.loader.length;
            breakpoints.push(breakpoints.at(-1)! + so.loader.length);
            allSongs.push(...so.loader.getData());
        });

        const userQuery = msg.content
            .split(" ")
            .filter((w) => w.length)
            .slice(1)
            .join(" ");

        const getCategory = (index: number) =>
            this.songOptions![lowerBoundLinear(breakpoints, index)];

        let selectedIndex = Math.floor(Math.random() * totalLength);

        if (!this.djCommands!.play.random_only && userQuery) {
            // * User Search
            const matched: { index: number; song: Song }[] = [];
            for (let i = 0; i < totalLength; i++) {
                if (
                    trim(allSongs[i].name?.toLowerCase() ?? "").includes(
                        trim(userQuery)
                    )
                ) {
                    if (!getCategory(i).appearance)
                        matched.push({
                            index: i,
                            song: allSongs[i],
                        });
                }
            }

            if (matched.length) {
                if (matched.length > 1) {
                    const message = shorten(
                        `${this.djCommands!.play.search_multiple_result}\n` +
                            this.printSongsList(matched),
                        1950
                    );

                    if (this.djCommands!.play.reply && !msg.deleted)
                        msg.reply(message);
                    else msg.channel.send(message);
                    return;
                }
                selectedIndex = matched[0].index;
            } else {
                const sf = this.djCommands!.play.search_fail;
                if (sf) {
                    if (this.djCommands!.play.reply && !msg.deleted)
                        msg.reply(sf);
                    else msg.channel.send(sf);
                    return;
                }
            }
        }

        const selectedSong = allSongs[selectedIndex];
        const selectedCategory = getCategory(selectedIndex);
        const category = selectedCategory.category;
        const onPlay = selectedCategory.onPlay;

        const isEmptyQueue = !this.corgiSwiftQueue.length;
        this.corgiSwiftQueue.push({
            msg,
            type: "SONG",
            song: selectedSong,
            category,
        });

        let message = onPlay.replace("{song_name}", selectedSong.name ?? "???");
        if (!isEmptyQueue) {
            if (this.corgiSwiftQueue[0].type == "TTS")
                message += ` ${this.djCommands!.play.onQueued.tts}`;
            else message += ` ${this.djCommands!.play.onQueued.song}`;
        }

        if (this.djCommands!.play.reply) msg.reply(message);
        else msg.channel.send(message);

        if (isEmptyQueue) this.corgiSwiftClearQueue();
    }

    private async corgiPlaySong(msg: Message, song: Song, category: string) {
        const embed = this.djCommands!.play.now_playing;
        if (embed?.send_embed) {
            try {
                const vidInfo = await ytdl.getBasicInfo(song.url);
                const msgE = new MessageEmbed({
                    title: embed.title ?? "Now Playing",
                    description: `\`\`\`css\n${song.name}\n\`\`\``,
                    color: embed.color ?? "BLUE",
                    author: {
                        name: msg.author.username,
                        iconURL: msg.author.avatarURL() ?? undefined,
                    },
                })
                    .setThumbnail(vidInfo.videoDetails.thumbnails[0].url)
                    .addField(
                        embed.requested_by ?? "Requested by",
                        `<@!${msg.author.id}>`
                    )
                    .addField(
                        embed.duration ?? "Duration",
                        durationFormat(
                            vidInfo.player_response.videoDetails.lengthSeconds
                        )
                    )
                    .addField(
                        embed.link ?? "Link",
                        `[${embed.click_here ?? "Click"}](${song.url})`
                    )
                    .setTimestamp()
                    .setFooter(embed.footer ?? "");
                msg.channel.send({ embeds: [msgE] });
            } catch (err) {
                Logger.log(
                    `Error getting info of ${song.name} or sending its embed : ${err}`,
                    "ERROR"
                );
                return;
            }
        }

        try {
            await this.voiceCtrl!.playSong(song.url, song.name ?? "", category);
        } catch (err) {
            Logger.log(
                `DJCorgi Music Deliwry Mission Failed while playing ${song.name}: ${err}`
            );
            if (this.voiceOptions?.fallback && !msg.deleted) {
                const iemsg = this.voiceOptions.fallback.internal;
                if (iemsg) {
                    if (this.voiceOptions.fallback.reply) msg.reply(iemsg);
                    else msg.channel.send(iemsg);
                }
            }
            this.voiceCtrl?.destruct();
        }
    }
}
