import readline from "readline";
import type { SBotClient } from "../client/";

export class Console {
    client?: SBotClient;

    constructor(client: SBotClient) {
        this.client = client;

        const rl = readline.createInterface({
            input: process.stdin,
            output: process.stdout,
        });

        rl.on("line", (cmd: string) => {
            this.execute(cmd);
        });
    }

    execute(cmd: string) {
        const cmds = cmd.split(" ");
        switch (cmds[0]) {
            case "logout":
                this.client?.destroy();
                process.exit(0);
            default:
                return "Unknown Command";
        }
    }
}
