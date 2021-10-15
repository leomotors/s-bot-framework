import { SongLoader } from "../data/songLoader";

export interface CorgiSwiftJutsu {
    jutsu: "CorgiSwift";
}

export interface SOnDemand {
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
                not_joinable?: string;
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

export interface DJOptions {
    prefixes: string[];
    random_only?: boolean;
    reply?: boolean;
}
