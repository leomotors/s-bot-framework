import { getFormattedTime } from "./time";

import fs from "fs/promises";
import chalk from "chalk";

export type LogStatus = "NORMAL" | "WARNING" | "ERROR" | "SUCCESS";

export class sLogger {
  private file_path: string;
  private file_status = false;

  constructor(file_path = "log") {
    const actual_path = `${file_path}/${getFormattedTime(true)}.txt`;
    this.file_path = actual_path;

    (async () => {
      try {
        await fs.writeFile(actual_path, `Created at ${getFormattedTime()}\n\n`);
        this.file_status = true;
      } catch (err) {
        this.log(`Error constructing Logger: ${err}`, "ERROR");
      }
    })();
  }

  async log(message: string, status: LogStatus = "NORMAL", showTime = true) {
    const logmsg = `${showTime ? `[${getFormattedTime()}] ` : ""}${message}`;

    if (this.file_status) {
      await fs.appendFile(this.file_path, logmsg + "\n");
    }

    if (status == "NORMAL") console.log(logmsg);
    else if (status == "WARNING") console.log(chalk.yellow(logmsg));
    else if (status == "ERROR") console.log(chalk.red(logmsg));
    else if (status == "SUCCESS") console.log(chalk.green(logmsg));
    else
      console.log(
        chalk.red(`ERROR: Unknown log status of ${status}! Blame TypeScript!`)
      );
  }
}
