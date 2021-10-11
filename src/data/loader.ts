import { sLogger } from "..";

export abstract class Loader {
    protected data: string[] = [];
    async loadData() {
        sLogger.log(
            "This Loader is not reactive and should not be added to console",
            "WARNING"
        );
    }
}
