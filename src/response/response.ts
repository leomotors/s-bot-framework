import { trim } from "../utils/string";

export interface TriggerOptions {
    prefixes?: string[];
    mention?: boolean;
    keywords: string[];
    keywords_exact_check?: boolean;
}

export interface ResponseOptions {
    trigger: TriggerOptions;
    response: () => string;
}

export class Response {
    isTrigger: (message: string) => boolean;
    clientID: () => string = () => "";
    response: () => string;

    constructor(Options: ResponseOptions) {
        const { trigger, response } = Options;

        this.response = response;

        const {
            prefixes = [],
            mention = false,
            keywords,
            keywords_exact_check = false,
        } = trigger;

        this.isTrigger = (message: string) => {
            if (mention && !message.includes(this.clientID())) return false;

            if (
                prefixes.length &&
                !(() => {
                    for (const prefix of prefixes)
                        if (message.startsWith(prefix)) return true;
                })()
            )
                return false;

            const keyword_check = keywords_exact_check
                ? (msg: string, kw: string) => msg.includes(kw)
                : (msg: string, kw: string) => trim(msg).includes(trim(kw));

            for (const keyword of keywords)
                if (keyword_check(message, keyword)) return true;

            return false;
        };
    }
}
