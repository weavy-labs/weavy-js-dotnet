import WeavyApp from './components/app';
import { assign } from "./utils/objects";

export default class Messenger extends WeavyApp {
    static defaults = { 
        type: "messenger",
        badge: true,
        pollingTime: 60 * 1000
    }

    #polling;

    static get observedAttributes() {
        return super.observedAttributes.concat(['badge', 'polling']);
    }

    get badge() {
        return this.hasAttribute('badge') || Messenger.defaults.badge;
    }

    set badge(val) {
        if (val) {
            this.setAttribute('badge', '')
        } else {
            this.removeAttribute('badge')
        }
    }

    get pollingTime() {
        return this.getAttribute('polling') || Messenger.defaults.pollingTime
    }

    set pollingTime(val) {
        if (val) {
            this.setAttribute('polling', val)
        } else {
            this.removeAttribute('polling')
        }
    }

    constructor(options) {
        options = assign(Messenger.defaults, options, true)
        super(options)

        if (options.badge) {
            if (options.pollingTime) {
                this.pollingTime = options.pollingTime
            }

            this.badge = options.badge
        }

        this.on("message", { name: "badge" }, (message) => {
            if (this.badge) {
                /**
                 * Triggered on an app when the badge count is updated.
                 * 
                 * @event BadgesPlugin#badge
                 * @returns {Object}
                 * @property {int} count - The count of the badge
                 * @property {WeavyApp} app - The app that fires the event
                 */
                this.triggerEvent("badge", { count: message.count })
            }
        });
    }

    attributeChangedCallback(name, oldValue, newValue) {
        super.attributeChangedCallback(name, oldValue, newValue)

        if (name === 'badge' || name === 'polling') {
            console.log('Updating badge');
            
            if (this.badge) {
                if(this.#polling) {
                    clearInterval(this.#polling);
                    this.#polling = null;
                }
                // poll until app is loaded
                this.#polling = window.setInterval(() => this.getBadge(), this.pollingTime);
                
                this.whenLoaded().then(() => {
                    // cancel polling            
                    clearInterval(this.#polling);
                    this.#polling = null;
    
                    // get badge when the app is loaded and ready
                    this.getBadge();
                });
    
                // get badge when weavy is loaded
                this.getBadge();
            } else if (this.#polling) {
                clearInterval(this.#polling);
                this.#polling = null;
            }
        }
    }

    /**
     * Gets the number of unread conversations and notifications.
     *
     * @example
     * weavy.plugins.badges.getBadges().then(function (data) { 
     *     console.log("New notifications count", data.notifications);
     *     console.log("Unread conversations count", data.conversations);
     * });
     *
     * @returns {Promise}
     * @property {int} conversations - Number of unread conversations
     * @property {int} notifications - Number of unread notifications
     * @property {int} total - The total number of unread conversations and notifications.
     */
    async fetchBadges() {
        const conversationBadge = await this.environment.fetch("dropin/client/conversation-badge/")
        return conversationBadge.private + conversationBadge.rooms
    }

    async getBadge() {
        if (this.badge) {
            const count = await this.fetchBadges()
            this.triggerEvent("badge", { count: count })
        }
    }
}

customElements.define("weavy-messenger", Messenger);