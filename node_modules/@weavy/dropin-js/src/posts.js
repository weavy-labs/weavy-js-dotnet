import WeavyApp from './components/app';
import { assign } from "./utils/objects";

export default class Posts extends WeavyApp {
    static defaults = {
        type: "posts"
    }

    constructor(options) {
        super(assign(Posts.defaults, options, true))
    }
}

customElements.define("weavy-posts", Posts);