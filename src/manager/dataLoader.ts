import fs from "fs/promises";

export class DataLoader<T = string> {
    private data_path: string;
    private data_key?: string;

    data: T[] = [];

    constructor(data_path: string, data_key?: string) {
        this.data_path = data_path;
        this.data_key = data_key;

        this.loadData();
    }

    async loadData() {
        const buffer = await fs.readFile(this.data_path);
        const obj = JSON.parse(buffer.toString());
        this.data = this.data_key ? obj[this.data_key] : obj;
    }
}
