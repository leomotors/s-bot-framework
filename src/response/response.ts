import { trim } from "../utils/string";
import { DataLoader } from "../manager";

export interface TriggerOptions {
    prefixes?: string[];
    mention?: boolean;
    keywords: string[] | DataLoader;
    keywords_exact_check?: boolean;
}

export interface ResponseOptions {
    trigger: TriggerOptions;
    response: () => string;
}

export class Response {
    clientID: () => string = () => "";
    trigger: TriggerOptions;
    response: () => string;

    private triggeredKeyword?: string;
    get triggered() {
        return this.triggeredKeyword;
    }

    constructor(Options: ResponseOptions) {
        const { trigger, response } = Options;

        this.trigger = trigger;
        this.response = response;
    }

    isTrigger(message: string) {
        const {
            prefixes = [],
            mention = false,
            keywords,
            keywords_exact_check = false,
        } = this.trigger;
        if (mention && !message.includes(this.clientID())) return false;

        if (
            prefixes.length &&
            !(() => {
                for (const prefix of prefixes)
                    if (message.startsWith(prefix)) return true;
                return false;
            })()
        )
            return false;

        const keyword_check = keywords_exact_check
            ? (msg: string, kw: string) => msg.includes(kw)
            : (msg: string, kw: string) => trim(msg).includes(trim(kw));

        let data: string[] = [];

        if (keywords instanceof DataLoader) {
            data = keywords.getData();
        } else {
            data = keywords;
        }
        for (const keyword of data)
            if (keyword_check(message, keyword)) {
                this.triggeredKeyword = keyword;
                return true;
            }

        return false;
    }
}
