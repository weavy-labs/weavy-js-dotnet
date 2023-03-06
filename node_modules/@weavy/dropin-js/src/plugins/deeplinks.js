import Weavy from '../weavy';

/**
 * Plugin for enabling url fragment (hash) deep links. 
 * 
 * Note: This plugin is disabled by default and must be enabled in weavy options.
 * 
 * @example
 * // Url with last opened panel only
 * var weavy = new Weavy({ 
 *   plugins: { 
 *     deeplinks: true 
 *   }
 * })
 * 
 * @example
 * // Url with all opened panels
 * var weavy = new Weavy({ 
 *   plugins: { 
 *     deeplinks: {
 *       multiple: true
 *     }
 *   }
 * })
 * 
 * @mixin DeeplinksPlugin
 * @param {Weavy} weavy - The weavy instance
 * @param {Object} options - Plugin options
 * @returns {Weavy.plugins.deeplinks}
 */
class DeeplinksPlugin {
    constructor(weavy, options) {

        weavy.on("history", function (e, history) {
            var options = weavy.options.plugins.deeplinks;

            var allOpenPanels = history.globalState.panels.filter(function (panelState) {
                return panelState.changedAt && panelState.isOpen && (!panelState.statusCode || panelState.statusCode === 200);
            });
            var lastOpenPanel = allOpenPanels.slice(-1);
            var panelUrls = (options.multiple ? allOpenPanels : lastOpenPanel).map(function (panelState) { return panelState.weavyUri; });
            history.url = panelUrls.length ? "#" + panelUrls.join(options.delimiter) : history.url.split("#")[0];

            return history;
        });


        // Initital state
        var state = weavy.history.getBrowserState();

        // Set a state from the URL if no state is present
        if (!state && window.location.hash) {
            var weavyUris = window.location.hash.replace(/^#/, "").split(options.delimiter);
            var urlState = weavy.history.getStateFromUri(weavyUris);

            if (urlState.panels.length) {
                weavy.debug("deeplinks: setting initial state");
                weavy.history.setBrowserState(urlState, "replace");
            }
        }
    }
}

/**
 * Default plugin options
 * 
 * @example
 * Weavy.plugins.deeplinks.defaults = {
 *   multiple: false,
 *   delimiter: ","
 * };
 * 
 * @name defaults
 * @memberof DeeplinksPlugin
 * @type {Object}
 * @property {Boolean} multiple=false - Should all opened panels be added to the hash?
 * @property {String} delimiter="," - Separator for multiple weavy URIs in the hash.
 */
DeeplinksPlugin.defaults = {
    multiple: false,
    delimiter: ","
};

/**
 * Non-optional dependencies.
 * 
 * @name dependencies
 * @memberof DeeplinksPlugin
 * @type {string[]}
 */
DeeplinksPlugin.dependencies = [];


// Register and return plugin
//console.debug("Registering Weavy plugin: deeplinks");
Weavy.plugins.deeplinks = DeeplinksPlugin;

export default DeeplinksPlugin;