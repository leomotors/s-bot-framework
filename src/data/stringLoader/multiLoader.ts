import { StringLoader } from "./stringLoader";

export interface MultiLoaderOptions {
    loader: StringLoader;
    label: string;
}

export class MultiLoader extends StringLoader {
    private loaders: MultiLoaderOptions[];

    constructor(loaders: MultiLoaderOptions[]) {
        super();
        this.loaders = loaders;
    }

    override getData(): string[] {
        let data: string[] = [];
        for (const loaderOption of this.loaders)
            data = data.concat(loaderOption.loader.getData());
        return data;
    }
}
