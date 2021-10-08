import { Loader } from "./loader";

export class StaticLoader extends Loader {
    constructor(data: string[]) {
        super();
        this.data = data;
    }
}
