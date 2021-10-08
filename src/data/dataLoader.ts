import fs from "fs/promises";
import { Loader, transformFunction } from "./loader";

export class DataLoader extends Loader {
    private data_path: string;
    private data_key?: string;

    constructor(
        data_path: string,
        data_key?: string,
        transform?: transformFunction
    ) {
        super(transform);
        this.data_path = data_path;
        this.data_key = data_key;

        this.loadData();
    }

    override async loadData() {
        try {
            const buffer = await fs.readFile(this.data_path);
            const obj = JSON.parse(buffer.toString());
            this.data = this.mapTransform(
                this.data_key ? obj[this.data_key] : obj
            );
        } catch (err) {
            this.data = [];
        }
    }
}
