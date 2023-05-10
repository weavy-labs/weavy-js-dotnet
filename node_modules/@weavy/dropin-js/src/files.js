import WeavyApp from './components/app';
import { assign } from "./utils/objects";

export default class Files extends WeavyApp {
    static defaults = {
        type: "files"
    }

    constructor(options) {
        super(assign(Files.defaults, options, true))
    }
}

customElements.define("weavy-files", Files);