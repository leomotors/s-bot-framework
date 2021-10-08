import { Loader } from "./loader";

export type transformFunction = (t: any) => string;

export abstract class StringLoader extends Loader {
    protected data: string[] = [];
    private transform?: transformFunction;

    constructor(transform?: transformFunction) {
        super();
        this.transform = transform;
    }

    async loadData() {}

    getData(): string[] {
        return this.data;
    }

    mapTransform(datas: any[]): string[] {
        if (!this.transform) return datas;

        const newdata = [];
        for (const data of datas) newdata.push(this.transform(data));
        return newdata;
    }
}
