import { S4 } from './id';
import WeavyPromise from './promise';
import WeavyConsole from './console';
import WeavyEvents from './events';

var console = new WeavyConsole("WeavyPostal");
//console.debug("postal.js", self.name);

function extractOrigin(url) {
    var extractOrigin = null;
    try {
        extractOrigin = /^((?:https?:\/\/[^/]+)|(?:file:\/\/))\/?/.exec(url)[1]
    } catch (e) {
        console.error("Unable to resolve location origin. Make sure you are using http, https or file protocol and have a valid location URL.");
    }
    return extractOrigin;
}

class WeavyPostalParent extends WeavyEvents {

    #contentWindows = new Set();
    #contentWindowsByWeavyId = new Map();
    #contentWindowOrigins = new WeakMap();
    #contentWindowNames = new WeakMap();
    #contentWindowWeavyIds = new WeakMap();
    #contentWindowDomain = new WeakMap();

    #origin = extractOrigin(window.location.href);

    timeout = 2000;

    constructor(options) {
        super()

        if (options?.timeout) {
            this.timeout = options.timeout;
        }

        window.addEventListener("message", (e) => {
            if (e.data.name && e.data.weavyId !== undefined) {
                if (e.data.weavyMessageId && e.data.name !== "message-receipt" && e.data.name !== "unready") {
                    console.debug("sending message receipt", e.data.weavyMessageId, e.data.name)
                    try {
                        e.source.postMessage({ name: "message-receipt", weavyId: e.data.weavyId, weavyMessageId: e.data.weavyMessageId }, e.origin);
                    } catch (error) {
                        console.error("could not post back message-receipt to source");
                    }
                }
    
                switch (e.data.name) {
                    case "register-child":
                        if (!this.#contentWindowWeavyIds.has(e.source)) {
                            console.warn("register-child: contentwindow not pre-registered", e.source);
                        }
    
                        if (this.#contentWindowOrigins.get(e.source) !== e.origin) {
                            console.error("register-child: " + this.#contentWindowNames.get(e.source) + " has invalid origin", e.origin);
                            return;
                        }
    
                        try {
                            var weavyId = this.#contentWindowWeavyIds.get(e.source);
                            var contentWindowName = this.#contentWindowNames.get(e.source);
    
                            if (contentWindowName) {
                                e.source.postMessage({
                                    name: "register-window",
                                    windowName: contentWindowName,
                                    weavyId: weavyId || true,
                                }, e.origin);
                            }
                        } catch (e) {
                            console.error("could not register frame window", weavyId, contentWindowName, e);
                        }
                        break;
                    case "ready":
                        console.log("received ready", this.#contentWindowsByWeavyId.has(e.data.weavyId) && this.#contentWindowNames.has(e.source) && this.#contentWindowsByWeavyId.get(e.data.weavyId).get(this.#contentWindowNames.get(e.source)) === e.source, e.origin)
                        if (this.#contentWindowsByWeavyId.has(e.data.weavyId) && this.#contentWindowNames.has(e.source) && this.#contentWindowsByWeavyId.get(e.data.weavyId).get(this.#contentWindowNames.get(e.source))) {
                            this.#contentWindowDomain.set(e.source, e.origin);
                            this.#distributeMessage(e);
                        }
    
                        break;
                    case "unready":
                        // Source window does no longer exist at this point
                        if (this.#contentWindowsByWeavyId.has(e.data.weavyId)) {
                            this.#distributeMessage(e, true);
                        }
    
                        break;
                    default:
                        if (e.source === window || this.#contentWindowsByWeavyId.size) {
                            this.#distributeMessage(e);
                        }
    
                        break;
                }
            }
        });
    }


    #distributeMessage(e, fromFrame) {
        const fromSelf = e.source === window && e.origin === this.#origin;
        fromFrame ||= this.#contentWindowOrigins.has(e.source) && e.origin === this.#contentWindowOrigins.get(e.source);

        if (fromSelf || fromFrame) {

            if (fromFrame && !e.data.windowName) {
                e.data.windowName = this.#contentWindowNames.get(e.source);
            }

            let messageName = e.data.name;

            //console.debug("message from", fromSelf && "self" || fromFrame && "frame " + e.data.windowName, e.data.name, e.data.weavyId);

            this.triggerEvent(messageName, e.data, e)
            this.triggerEvent("message", e.data, e)
        }
    }

    /**
     * Sends the id of a frame to the frame content scripts, so that the frame gets aware of which id it has.
     * The frame needs to have a unique name attribute.
     *
     * @category panels
     * @param {string} weavyId - The id of the group or entity which the contentWindow belongs to.
     * @param {Window} contentWindow - The frame window to send the data to.
     */
    registerContentWindow(contentWindow, contentWindowName, weavyId, contentOrigin) {
        try {
            if (!contentWindowName) {
                console.error("registerContentWindow() No valid contentWindow to register, must be a window and have a name.");
                return;
            }
        } catch (e) {
            console.error("registerContentWindow() cannot access contentWindowName")
        }

        if (contentWindow.self) {
            contentWindow = contentWindow.self;
        }

        if (!weavyId || weavyId === "true") {
            weavyId = true;
        }

        if (!this.#contentWindowsByWeavyId.has(weavyId)) {
            this.#contentWindowsByWeavyId.set(weavyId, new Map());
        }

        this.#contentWindowsByWeavyId.get(weavyId).set(contentWindowName, contentWindow);
        this.#contentWindows.add(contentWindow);
        this.#contentWindowNames.set(contentWindow, contentWindowName);
        this.#contentWindowWeavyIds.set(contentWindow, weavyId);
        this.#contentWindowOrigins.set(contentWindow, contentOrigin);
    }

    unregisterAll(weavyId) {
        if (this.#contentWindowsByWeavyId.has(weavyId)) {
            this.#contentWindowsByWeavyId.get(weavyId).forEach((contentWindow, contentWindowName) => {
                this.unregisterContentWindow(contentWindowName, weavyId);
            });
            this.#contentWindowsByWeavyId.get(weavyId)
            this.#contentWindowsByWeavyId.delete(weavyId);
        }
    }

    unregisterContentWindow(windowName, weavyId) {
        if (this.#contentWindowsByWeavyId.has(weavyId)) {
            if (this.#contentWindowsByWeavyId.get(weavyId).has(windowName)) {
                var contentWindow = this.#contentWindowsByWeavyId.get(weavyId).get(windowName);
                try {
                    this.#contentWindows.delete(contentWindow);
                    this.#contentWindowNames.delete(contentWindow);
                    this.#contentWindowWeavyIds.delete(contentWindow);
                    this.#contentWindowOrigins.delete(contentWindow);
                } catch (e) { /* no need to delete contentwindow */ }
            }
            this.#contentWindowsByWeavyId.get(weavyId).delete(windowName);
            if (this.#contentWindowsByWeavyId.get(weavyId).size === 0) {
                try {
                    this.#contentWindowsByWeavyId.delete(weavyId);
                } catch (e) { /* no need to delete weavyId */ }
            }
        }
    }

    #whenPostMessage(contentWindow, message, transfer) {
        var whenReceipt = new WeavyPromise();

        if (transfer === null) {
            // Chrome does not allow transfer to be null
            transfer = undefined;
        }

        var toSelf = contentWindow === window.self;
        var origin = toSelf ? extractOrigin(window.location.href) : this.#contentWindowOrigins.get(contentWindow);
        var validWindow = toSelf || contentWindow && origin === this.#contentWindowDomain.get(contentWindow)

        if (validWindow) {
            if (!message.weavyMessageId) {
                message.weavyMessageId = S4() + S4();
            }

            queueMicrotask(() => {
                var messageWatchdog = setTimeout(() => {
                    if (whenReceipt.state() === "pending") {
                        whenReceipt.reject(new Error("postMessage() receipt timed out: " + message.weavyMessageId + ", " + message.name));
                    }
                }, this.timeout || 2000);

                this.on("message-receipt", { weavyId: message.weavyId, weavyMessageId: message.weavyMessageId }, () => {
                    console.debug("message-receipt received", message.weavyMessageId, message.name);
                    clearTimeout(messageWatchdog);
                    whenReceipt.resolve();
                });

                try {
                    contentWindow.postMessage(message, origin, transfer);
                } catch (e) {
                    whenReceipt.reject(e);
                }
            })
        } else {
            whenReceipt.reject(new Error("postMessage() Invalid window origin: " + origin + ", " + message.name));
        }

        return whenReceipt();
    }

    postToChildren(message, transfer) {
        if (typeof message !== "object" || !message.name) {
            console.error("postToChildren() Invalid message format", message);
            return;
        }

        if (transfer === null) {
            // Chrome does not allow transfer to be null
            transfer = undefined;
        }

        message.distributeName = message.name;
        message.name = "distribute";
        message.weavyId = message.weavyId || true;

        this.#contentWindows.forEach((contentWindow) => {
            if (this.#contentWindowOrigins.get(contentWindow) === this.#contentWindowDomain.get(contentWindow)) {
                try {
                    contentWindow.postMessage(message, this.#contentWindowOrigins.get(contentWindow), transfer);
                } catch (e) {
                    console.warn("postToChildren() could not distribute message to " + this.#contentWindowNames.get(contentWindow))
                }
            }
        })

    }

    postToFrame(windowName, weavyId, message, transfer) {
        if (typeof message !== "object" || !message.name) {
            console.error("postToFrame() Invalid message format", message);
            return;
        }

        var contentWindow;
        try {
            contentWindow = this.#contentWindowsByWeavyId.get(weavyId).get(windowName);
        } catch (e) {
            console.error("postToFrame() Window not registered", weavyId, windowName);
        }

        message.weavyId = weavyId;

        return this.#whenPostMessage(contentWindow, message, transfer);
    }

    postToSelf(message, transfer) {
        if (typeof message !== "object" || !message.name) {
            console.error("postToSelf() Invalid message format", message);
            return;
        }

        message.weavyId = message.weavyId || true;

        return this.#whenPostMessage(window.self, message, transfer);
    }

    postToSource(e, message, transfer) {
        if (e.source && e.data.weavyId !== undefined) {
            var fromSelf = e.source === window.self && e.origin === this.#origin;
            var fromFrame = this.#contentWindowOrigins.has(e.source) && e.origin === this.#contentWindowOrigins.get(e.source);

            if (transfer === null) {
                // Chrome does not allow transfer to be null
                transfer = undefined;
            }

            if (fromSelf || fromFrame) {
                
                message.weavyId = e.data.weavyId;

                try {
                    e.source.postMessage(message, e.origin, transfer);
                } catch (e) {
                    console.error("postToSource() Could not post message back to source", e);
                }
            }
        }
    }
}


export default new WeavyPostalParent();



