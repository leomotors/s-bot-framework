import fetch from "node-fetch";
import { Loader, transformFunction } from "./loader";

export class OnlineLoader extends Loader {
    private url: string;
    private data_key?: string;

    constructor(url: string, data_key?: string, transform?: transformFunction) {
        super(transform);
        this.url = url;
        this.data_key = data_key;

        this.loadData();
    }

    override async loadData() {
        try {
            const res = await fetch(this.url);
            if (res.status >= 400) throw `Error ${res.status}`;
            const restxt = await res.text();
            const obj = JSON.parse(restxt);
            this.data = this.mapTransform(
                this.data_key ? obj[this.data_key] : obj
            );
        } catch (err) {
            // TODO Log error
        }
    }
}
