import WeavyApp from './components/app';
import { assign } from "./utils/objects";

export default class Chat extends WeavyApp {
    static defaults = {
        type: "chat"
    }

    constructor(options) {
        super(assign(Chat.defaults, options, true))
    }
}

customElements.define("weavy-chat", Chat);