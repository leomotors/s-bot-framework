import readline from "readline";

import type { SBotClient } from "../client/";
import { Loader } from "../data/loader";

export class Console {
    sbclient?: SBotClient;

    constructor(client: SBotClient) {
        this.sbclient = client;

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
            case "reload":
                for (const loader of this.loaders) loader.loadData();
                break;
            case "logout":
                this.sbclient?.client?.destroy();
                process.exit(0);
            default:
                return "Unknown Command";
        }
    }

    private loaders: Loader<unknown>[] = [];
    addLoader(...args: Loader<unknown>[]) {
        this.loaders.push(...args);
    }
}
