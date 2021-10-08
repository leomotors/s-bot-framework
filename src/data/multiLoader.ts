import { Loader } from "./loader";

export interface MultiLoaderOptions {
    loader: Loader;
    label: string;
}

export class MultiLoader extends Loader {
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
