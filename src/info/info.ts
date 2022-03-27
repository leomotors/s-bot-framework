import { Version } from "../config.g";

export function AboutFramework() {
    return (
        `S-Bot Framework Version ${Version}\n` +
        `Repository: https://github.com/Leomotors/s-bot-framework`
    );
}

/** Version of S-Bot-Framework */
export const FrameWorkVersion = Version;
