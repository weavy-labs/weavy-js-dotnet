import Weavy from '../weavy';

/**
 * Plugin for displaying dilaog/toast/alert messages.
 * 
 * @mixin DialogPlugin
 * @param {Weavy} weavy - The Weavy instance
 * @param {Object} options - Plugin options
 * @returns {Weavy.plugins.dialog}
 * @property {DialogPlugin#dialog} .dialog()
 * @typicalname weavy
 */
class DialogPlugin {
    constructor(weavy, options) {
        var _addMessages = [];

        function displayMessage(message, sticky) {
            if (!sticky) {
                weavy.whenTimeout(5000).then(function () {
                    message.classList.remove("wy-show");
                });
                weavy.whenTimeout(5200).then(function () {
                    message.remove();
                });
            }
            weavy.whenTimeout(1).then(function () {
                message.classList.add("wy-show");
            });
            weavy.nodes.dialogs.appendChild(message);
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
        this.message = weavy.dialog = function (message, sticky) {
            var dialogMessage = document.createElement("div");
            dialogMessage.className = options.className;
            if (message instanceof HTMLElement || message instanceof DocumentFragment) {
                dialogMessage.appendChild(message);
            } else {
                dialogMessage.innerHTML = message;
            }

            /*var close = document.createElement("div");
            close.className = "wy-icon" + (typeof options.controls.close === "string" ? " " + options.controls.close : "");
            close.title = "Close";
            close.innerHTML = '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24"><path d="M19,6.41L17.59,5L12,10.59L6.41,5L5,6.41L10.59,12L5,17.59L6.41,19L12,13.41L17.59,19L19,17.59L13.41,12L19,6.41Z" /></svg>';
            weavy.on(close, "click", panel.close.bind(panel));
            dialogMessage.appendChild(close);*/

            if (weavy.nodes.global) {
                displayMessage(dialogMessage, sticky);
            } else {
                _addMessages.push([dialogMessage, sticky]);
            }
            weavy.log("Dialog:", dialogMessage.innerText);

            return dialogMessage;
        };

        weavy.on("build", () => {
            if(!weavy.nodes.dialogs) {
                var container = document.createElement("div");
                container.className = options.containerClassName;
                weavy.nodes.global.appendChild(container);
                weavy.nodes.dialogs = container;
            }
        })

        weavy.on("after:build", () => {
            _addMessages.forEach((message) => {
                displayMessage.apply(weavy, message);
            });
            _addMessages = [];
        });
    }
}

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
DialogPlugin.defaults = {
    className: "wy-alert wy-fade",
    containerClassName: "wy-alerts"
};

Weavy.plugins.dialog = DialogPlugin;
export default DialogPlugin;
