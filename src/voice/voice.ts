import {
    AudioPlayer,
    createAudioPlayer,
    DiscordGatewayAdapterCreator,
    entersState,
    joinVoiceChannel,
    VoiceConnection,
    VoiceConnectionStatus,
} from "@discordjs/voice";

import { Message, StageChannel } from "discord.js";

import { sLogger } from "..";

enum VoiceConstructError {
    success = 0,
    user_not_in_voice = 1,
    is_stage_channel = 2,
}

export class Voice {
    private player: AudioPlayer;
    private connection?: VoiceConnection;

    channelName?: string;
    error = VoiceConstructError.success;

    constructor(msg: Message) {
        this.player = createAudioPlayer();

        const voiceChannel = msg.member?.voice.channel;

        if (!voiceChannel) {
            this.error = VoiceConstructError.user_not_in_voice;
            return;
        }

        this.channelName = voiceChannel.name;

        if (voiceChannel instanceof StageChannel) {
            this.error = VoiceConstructError.is_stage_channel;
            return;
        }

        this.connection = joinVoiceChannel({
            channelId: voiceChannel.id,
            guildId: voiceChannel.guild.id,
            adapterCreator: voiceChannel.guild
                .voiceAdapterCreator as DiscordGatewayAdapterCreator,
            selfMute: false,
            selfDeaf: false,
        });

        this.connection.subscribe(this.player);
    }

    async waitTillReady(): Promise<boolean> {
        if (!this.connection) return false;
        try {
            await entersState(
                this.connection,
                VoiceConnectionStatus.Ready,
                5000
            );
            return true;
        } catch (err) {
            sLogger.log(`Error joining ${this.channelName} : ${err}`, "ERROR");
            return false;
        }
    }
}
