import { assign } from '../utils/objects';
import { classNamesConcat } from '../utils/dom';
import WeavyPostal from '../utils/postal-parent';
import WeavyConsole from '../utils/console';
import WeavyPanel from './panel';
import WeavyEvents from '../utils/events';

const console = new WeavyConsole("Overlays")
//console.debug("overlay.js");

const OverlayClassNames = {
    modal: "wy-modal",
    preview: "wy-dark",
    overlay: "wy-modal-full"
}

const OverlayUrlRegex = {
    preview: /^(.*)(\/attachments\/[0-9]+\/?)(.+)?$/,
    content: /^(.*)(\/content\/[0-9]+\/?)(.+)?$/
}

/**
 * @class WeavyOverlay
 * @classdesc Class for handling panel overlays.
 */
export default class WeavyOverlays extends WeavyEvents {

    #environment;
    root;

    #overlays = new Map();

    #container = null;

    #className = '';

    get className() {
        return this.#className;
    }

    set className(className) {
        this.#className = className;
        this.#overlays.forEach((overlay) => {
            overlay.className = classNamesConcat(overlay.baseClassName, this.#className);
        })
    }

    #css;

    set css(css) {
        this.#css = css;
    }

    /**
     * Reference to the panels container for the overlays
     * @name WeavyOverlays#container
     * @type {WeavyPanels~container}
     */
    get container() { return this.#container; }

    /**
     * Class for handling panel overlays.
     * 
     * @constructor
     * @hideconstructor
     * @param {Weavy} weavy - Weavy instance
     */
    constructor (environment, root, eventParent) {
        super();

        this.#environment = environment;
        this.root = root;
        this.eventParent = eventParent

        // Layer open
        // TODO: move this to panels-ish?
        // TODO: UNREGISTER



        if (!this.#container) {
            /**
             * Preview panel container. Attached to {@link Weavy#nodes#global}.
             * 
             * @type {WeavyPanels~container}
             * @category panels
             * @name Weavy#nodes#panels#overlays
             **/
            this.#container = document.createElement("div");
            this.root.container.classList.add("wy-viewport");
            this.root.container.appendChild(this.#container);
            console.log("overlay root", this.#container)
            this.#container.classList.add("wy-overlays");
        }


        // TODO: FIX
        /*weavy.on("after:panel-close", (close) => {
            if (close.panels === weavy.nodes.panels.overlays) {
                var overlayId = close.panelId.split("overlay:")[1];
                var panel = this.#overlays.get(overlayId);

                // TODO: Garbage cleanup needed instead

                //_overlays.delete(overlayId);
                console.log("overlay panel after:close", close.panelId, overlayId);

                if (panel) {
                    //panel.close().then(() => panel.remove());
                }

                this.#sortOverlays();
                this.#getTopOverlay()?.focus();
            }
        });*/


        // Keyboard handling

        /**
         * Requests the topmost open panel to make a prev navigation
         * @param {Event} e
         */
        const handleKey = (which) => {
            var topOverlay = this.#getTopOverlay();

            if (topOverlay) {
                if (which === 27) { // Esc
                    topOverlay.close();
                    return true;
                } else {
                    topOverlay.postMessage({ name: "key:trigger", which: which });
                    return true;
                }
            }
        }

        /**
         * Receives a prev request from a panel and sends it to the topmost open preview panel.
         **/
        // TODO: UNREGISTER
        WeavyPostal.on("key:press", { weavyId: this.#environment.getId() }, (key) => {
            console.log("bouncing key", key.which, this.#getTopOverlay()?.panelId);
            handleKey(key.which);
        });

        // TODO: UNREGISTER
        document.addEventListener("keyup", (e) => {
            if (handleKey(e.which)) {
                e.stopImmediatePropagation();
            }
        })

        // END CONSTRUCTOR
    }

    // TODO: Make overlay a class
    /**
     * Creates a new overlay
     * 
     * @param {object} overlayOptions 
     * @returns 
     */
    getOverlay(overlayOptions) {
        // Copy all options
        overlayOptions = assign(overlayOptions);

        overlayOptions.controls ??= { close: true };

        let overlayId = overlayOptions.overlayId || overlayOptions.type || "overlay";
        let overlay = this.#overlays.get(overlayId);

        if (!overlay) {
            let overlayUrl = new URL(overlayOptions.url, this.#environment.url);
            
            if (overlayOptions.type) {
                overlayOptions.className = classNamesConcat(OverlayClassNames[overlayOptions.type], overlayOptions.className);
            }

            let baseClassName = overlayOptions.className;

            // TODO: This should be inherited from the app instead
            if (this.#className) {
                overlayOptions.className = classNamesConcat(overlayOptions.className, this.#className);
            }

            overlay = new WeavyPanel()
            overlay.configure(this.#environment, "overlay:" + overlayId, overlayUrl, overlayOptions, this);
            this.#container.appendChild(overlay.node)

            overlay.on("panel-open", () => {
                this.#moveToFront(overlayId);
            });

            overlay.on("panel-history-add", ({action, state }) => {
                this.triggerEvent("overlay-history-add", { action, states: Array.from(this.#overlays.values()).map((o) => o.getState()) })
            })

            overlay.baseClassName = baseClassName;
            this.#overlays.set(overlayId, overlay);

            console.log("created overlay", overlay)
        } else {
            if (overlayOptions.title) {
                overlay.node.dataset.title = overlayOptions.title;
            } else {
                delete overlay.node.dataset.title;
            }
        }

        return overlay;
    }

    /**
     * Opens a url in an overlay panel. If the url is an attachment url it will open in the preview panel.
     * 
     * @param {string} url - The url to the overlay page to open
     */
    async open(request) {
        await this.#environment.whenReady()

        var url = request.url;
        var overlayType = request.target || "overlay";

        if (overlayType === "overlay" && OverlayUrlRegex.preview.test(url)) {
            overlayType = "preview";
        }

        var overlay = this.getOverlay({ type: overlayType, url: url });

        if (request.source && request.source !== overlay.frame.name) {
            this.#reset(overlay);
        }

        await overlay.open(url);
        console.log("OVERLAY OPENED")
    }

    /**
     * Opens an url in an overlay panel. If the url is an attachment url it will open in the preview panel.
     * 
     * @param {WeavyHistory~panelState} panelState - The url to the overlay page to open
     */
    async openState (panelState) {
        await this.#environment.whenReady()

        console.log("open overlay history state", panelState);
        let panelAttributes = assign(panelState.attributes, { title: panelState.title })
        let overlay = this.getOverlay(panelAttributes)
        overlay.setState(panelState)
    }

    /**
     * Closes all open overlay panels.
     * @param {boolean} noHistory - Set to true if you want no navigation history generated when closing
     **/
    async closeAll (noHistory) {
        await this.#environment.whenReady()

        await Promise.all(Array.from(this.#overlays.values()).map(async (overlay) => {
            await overlay.close(noHistory);
        }))
    }

    async postStyles() {
        await this.#environment.whenReady()

        await Promise.all(Array.from(this.#overlays.values()).map(async (overlay) => {
            await overlay.postStyles();
        }))
    }

    /**
     * Tries to move forward an overlay panel
     * 
     * @property {string} overlayId - The id of the panel to move forward;
     */
    #moveToFront(overlayId) {
        var overlay = this.#overlays.get(overlayId)
        if (overlay) {
            console.debug("preview panels moveToFront", overlayId);

            this.#overlays.delete(overlayId);
            this.#overlays.set(overlayId, overlay);

            requestAnimationFrame(() => this.#sortOverlays());
        }
    }

    #sortOverlays() {
        console.debug("sorting overlays");
        Array.from(this.#overlays.values()).filter((overlay) => overlay.isOpen).reverse().forEach((overlay, i) => {
            if (overlay.node) {
                overlay.node.style.transform = "translateZ(-" + i + "rem)";
            }
        });
    }

    #reset(overlay) {
        if (overlay.isOpen) {
            overlay.loadingStarted(true);
        } else {
            overlay.reset();
        }
    }

    #getTopOverlay() {
        return Array.from(this.#overlays.values()).filter((overlay) => overlay.isOpen).pop();
    }
}

