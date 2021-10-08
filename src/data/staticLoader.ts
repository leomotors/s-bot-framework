import { StringLoader } from "./stringLoader";

export class StaticLoader extends StringLoader {
    constructor(data: string[]) {
        super();
        this.data = data;
    }
}
