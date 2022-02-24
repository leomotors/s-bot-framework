import { ColorResolvable, Message } from "discord.js";

import { Song, SongLoader } from "../data/songLoader";

export interface CorgiSwiftJutsu {
    jutsu: "CorgiSwift";
    fallback?: {
        no_channel?: string;
        stage_channel?: string;
        not_joinable?: string;
        internal?: string;
        reply?: boolean;
    };
}

export type VoiceOptions = CorgiSwiftJutsu;

export enum SongAppearance {
    EVERYWHERE = 0,
    // * Not allow searching for this song
    RANDOM_ONLY = 1,
}

export interface SongOptions {
    loader: SongLoader;
    category: string;
    appearance: SongAppearance;
    onPlay: string;
}

export interface DJCommands {
    play: {
        prefixes: string[];
        random_only?: boolean;
        reply?: boolean;
        onQueued: {
            tts: string;
            song: string;
        };
        search_fail?: string;
        search_multiple_result?: string;
        now_playing?: {
            send_embed: boolean;
            color?: ColorResolvable;
            title?: string;
            requested_by?: string;
            duration?: string;
            link?: string;
            click_here?: string;
            footer?: string;
        };
    };
    skip?: {
        prefixes: string[];
        already_empty?: string;
        react?: string;
    };
    clear?: {
        prefixes: string[];
        already_empty?: string;
        react?: string;
    };
    overrides?: {
        direct_youtube?: {
            admin_only: boolean;
            // * This Prefixes will go after play's prefixes
            prefixes: string[];
            message: string;
            reply?: boolean;
        };
        play_any_song?: {
            // TODO
            admin_only: boolean;
            // * This Prefixes will go after play's prefixes
            prefixes: string[];
        };
    };
}

interface corgiQueueTTS {
    msg: Message;
    type: "TTS";
    content: string;
}

interface corgiQueueSong {
    msg: Message;
    type: "SONG";
    song: Song;
    category: string;
}

export type corgiQueue = corgiQueueTTS | corgiQueueSong;
