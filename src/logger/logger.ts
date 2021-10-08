import { getFormattedTime } from "./time";

import fs from "fs/promises";
import chalk from "chalk";

export type LogStatus = "NORMAL" | "WARNING" | "ERROR" | "SUCCESS";

export abstract class sLogger {
    private static file_path: string;
    private static file_status = false;

    static async startFile(file_path = "log") {
        const actual_path = `${file_path}/${getFormattedTime(true)}.txt`;
        sLogger.file_path = actual_path;

        try {
            await fs.writeFile(
                actual_path,
                `Created at ${getFormattedTime()}\n\n`
            );
            sLogger.file_status = true;
        } catch (err) {
            sLogger.log(
                `Error initializing Log File: ${err}
            Please make sure you have directory ${file_path} created`,
                "ERROR"
            );
        }
    }

    static async log(
        message: string,
        status: LogStatus = "NORMAL",
        showTime = true
    ) {
        const logmsg = `${
            showTime ? `[${getFormattedTime()}] ` : ""
        }${message}`;

        if (this.file_status) {
            await fs.appendFile(this.file_path, logmsg + "\n");
        }

        if (status == "NORMAL") console.log(logmsg);
        else if (status == "WARNING") console.log(chalk.yellow(logmsg));
        else if (status == "ERROR") console.log(chalk.red(logmsg));
        else if (status == "SUCCESS") console.log(chalk.green(logmsg));
        else
            console.log(
                chalk.red(`LOGGER ERROR: Unknown log status of ${status}!`)
            );
    }
}
