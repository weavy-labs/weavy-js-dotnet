import { whenTimeout } from '../utils/timeout';
import WeavyConsole from '../utils/console';
import WeavyStyles, { applyStyleSheet } from "./styles";

const console = new WeavyConsole("Dialog")

/**
 * Plugin for displaying dialog/toast/alert messages.
 * 
 * @param {Weavy} weavy - The Weavy instance
 * @param {Object} options - Plugin options
 * @returns {Weavy.plugins.dialog}
 * @property {DialogPlugin#dialog} .dialog()
 * @typicalname weavy
 */
export default class WeavyDialog {
    root;
    #container;
    #styles;

    /**
     * Default plugin options
     * 
     * @example
     * Weavy.plugins.dialog.defaults = {
     *     className: "wy-toast wy-toast-primary wy-fade wy-show"
     * };
     * 
     * @name defaults
     * @memberof DialogPlugin
     * @type {Object}
     * @property {string} [className=wy-alert wy-fade] - Default classes for a message
     * @property {string} [containerClassName=wy-alerts] - Default classes for the message container
     */
    options = {
        className: "wy-alert wy-fade",
        containerClassName: "wy-alerts"
    };


    constructor(root, options) {
        this.root = root;

        if (options) {
            this.options = options;
        } 

        this.#styles = new WeavyStyles(document.body);
    
        this.#styles.on("styles-update", async () => {
            console.log("updating dialog styles")
          for (const styleSheetName in this.#styles.styleSheets) {
            let styleSheet = this.#styles.styleSheets[styleSheetName]
            applyStyleSheet(this.root.dom, styleSheet);
          }
        });

        this.#container = document.createElement("div");
        this.root.container.classList.add("wy-viewport");
        this.#container.className = this.options.containerClassName;
        this.root.container.appendChild(this.#container);
    }

    /**
     * Displays a dialog.
     *
     * @example
     * weavy.dialog("Weavy is awesome!", true);
     *
     * @param {string} message - The message to display
     * @param {boolean} [sticky=false] - Should the dialog be sticky and not dismissable?
     */
    message(message, sticky) {
        var dialogMessage = document.createElement("div");
        dialogMessage.className = this.options.className;
        if (message instanceof HTMLElement || message instanceof DocumentFragment) {
            dialogMessage.appendChild(message);
        } else {
            dialogMessage.innerHTML = message;
        }

        /*var close = document.createElement("div");
        close.className = "wy-icon" + (typeof options.controls.close === "string" ? " " + options.controls.close : "");
        close.title = "Close";
        close.innerHTML = '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24"><path d="M19,6.41L17.59,5L12,10.59L6.41,5L5,6.41L10.59,12L5,17.59L6.41,19L12,13.41L17.59,19L19,17.59L13.41,12L19,6.41Z" /></svg>';
        close.onclick = panel.close.bind(panel);
        dialogMessage.appendChild(close);*/


        this.displayMessage(dialogMessage, sticky);
        console.log("Dialog:", dialogMessage.innerText);

        return dialogMessage;
    }

    displayMessage(message, sticky) {
        if (!sticky) {
            whenTimeout(5000).then(() => {
                message.classList.remove("wy-show");
            });
            whenTimeout(5200).then(() => {
                message.remove();
            });
        }
        whenTimeout(1).then(() => {
            message.classList.add("wy-show");
        });
        this.#container.appendChild(message);
    }
}
