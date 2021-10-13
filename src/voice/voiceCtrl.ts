import {
    AudioPlayer,
    AudioPlayerStatus,
    AudioResource,
    createAudioPlayer,
    createAudioResource,
    DiscordGatewayAdapterCreator,
    entersState,
    getVoiceConnection,
    joinVoiceChannel,
    StreamType,
    VoiceConnectionStatus,
} from "@discordjs/voice";

import { Message, StageChannel, VoiceChannel } from "discord.js";

import chalk from "chalk";

import { getAllAudioBase64 } from "google-tts-api";
import ytdl from "ytdl-core";

import { sLogger } from "../logger";
import { shorten } from "../utils/string";

export enum VoiceValidateResult {
    OK = 0,
    NO_CHANNEL = 1,
    STAGE_CHANNEL = 2,
}

export class VoiceControl {
    private handleDisconnect: () => void;
    private player: AudioPlayer;
    private guildID: string;
    private channelName: string;
    private voiceChannelID: string;

    isSameChannel(channel?: VoiceChannel | StageChannel | null) {
        return channel?.id == this.voiceChannelID;
    }

    static validateUser(msg: Message): VoiceValidateResult {
        const channel = msg.member?.voice.channel;

        // * This Bot and every others cannot enter *undefined* channel
        if (!channel) return VoiceValidateResult.NO_CHANNEL;

        // * This Bot doesn't support Stage Channel
        if (channel instanceof StageChannel)
            return VoiceValidateResult.STAGE_CHANNEL;

        return VoiceValidateResult.OK;
    }

    constructor(msg: Message, handleDisconnect: () => void) {
        this.handleDisconnect = handleDisconnect;
        const validateResult = VoiceControl.validateUser(msg);
        if (validateResult) throw validateResult;

        this.player = createAudioPlayer();
        const voiceChannel = msg.member!.voice.channel! as VoiceChannel;
        this.guildID = voiceChannel.guild.id;
        this.channelName = voiceChannel.name;
        this.voiceChannelID = voiceChannel.id;

        const connection = joinVoiceChannel({
            channelId: voiceChannel.id,
            guildId: voiceChannel.guild.id,
            adapterCreator: voiceChannel.guild
                .voiceAdapterCreator as DiscordGatewayAdapterCreator,
            selfMute: false,
        });

        connection.subscribe(this.player);

        // * https://discordjs.guide/voice/voice-connections.html#handling-disconnects
        connection.on(
            VoiceConnectionStatus.Disconnected,
            async (oldState, newState) => {
                try {
                    await Promise.race([
                        entersState(
                            connection,
                            VoiceConnectionStatus.Signalling,
                            5000
                        ),
                        entersState(
                            connection,
                            VoiceConnectionStatus.Connecting,
                            5000
                        ),
                    ]);
                    // Seems to be reconnecting to a new channel - ignore disconnect
                } catch (error) {
                    // Seems to be a real disconnect which SHOULDN'T be recovered from
                    sLogger.log(
                        `Disconnected from ${this.channelName}`,
                        "WARNING"
                    );
                    this.destruct();
                }
            }
        );
    }

    destruct() {
        const connection = getVoiceConnection(this.guildID);
        connection?.destroy();
        this.handleDisconnect();
    }

    async waitTillReady(mode: string): Promise<boolean> {
        const connection = getVoiceConnection(this.guildID);

        if (!connection) return false;
        try {
            await entersState(connection, VoiceConnectionStatus.Ready, 5000);
            sLogger.log(
                `Successfully joined ${this.channelName} as ${chalk.magenta(
                    mode
                )} 🤩🤩`,
                "SUCCESS"
            );
            return true;
        } catch (err) {
            sLogger.log(`Error joining ${this.channelName} : ${err}`, "ERROR");
            return false;
        }
    }

    private speakQueue: AudioResource<any>[] = [];

    async speak(content: string) {
        sLogger.log(
            `[TTS] Started Speaking ${shorten(content, 30)} to ${
                this.channelName
            }`
        );

        // TODO Optimize by getAllAudioUrl then get each Audio async
        const results = await getAllAudioBase64(content, {
            lang: "th",
            slow: false,
            host: "https://translate.google.com",
        });

        const initiated = !!this.speakQueue.length;

        this.speakQueue = this.speakQueue.concat(
            results.map((res) =>
                createAudioResource("data:audio/ogg;base64," + res.base64, {
                    inputType: StreamType.OggOpus,
                })
            )
        );

        if (!initiated) this.player.play(this.speakQueue.shift()!);

        return new Promise((resolve, reject) => {
            this.player.on(
                AudioPlayerStatus.Idle,
                (() => {
                    if (this.speakQueue.length) {
                        this.player.play(this.speakQueue.shift()!);
                    } else {
                        resolve(true);
                    }
                }).bind(this)
            );
        });
    }

    async playSong(url: string) {
        // https://stackoverflow.com/questions/63199238/discord-js-ytdl-error-input-stream-status-code-416
        const musicStream = ytdl(url, {
            quality: "highestaudio",
            highWaterMark: 1 << 25,
        });

        const musicRc = createAudioResource(musicStream);
        this.player.play(musicRc);
    }
}
