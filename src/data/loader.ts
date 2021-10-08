export type transformFunction = (t: any) => string;

export class Loader {
    protected data: string[] = [];
    private transform?: transformFunction;

    constructor(transform?: transformFunction) {
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
