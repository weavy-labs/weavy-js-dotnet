/* global WEAVY_DEVELOPMENT */

// LOGGING FUNCTIONS

// Weavy colors
const colors = [
    "#36ace2", // LightBlue-500
    "#6599eb", // Blue-400
    "#646fed", // Indigo-400
    "#773bde", // DeepPurple-500
    "#bc4bce", // Purple-500
    "#d54487", // Pink-500
    "#de4b3b", // Red-500
    "#e17637", // DeepOrange-500
    "#e3a135", // Orange-500
    "#c9a018", // Amber-600
    "#a4c51b", // Lime-600
    "#cbbc15", // Yellow-600
    "#7cd345", // LightGreen-500
    "#53c657", // Green-500
    "#45d391", // Teal-500
    "#38dde0"  // Cyan-500
];

const gray = "#8c8c8c";

/**
 * Wrapper for applying colors/styles to the log functions.
 * 
 * @private
 * @function
 * @memberof WeavyConsole
 * @param {function} logMethod - Native logging function to wrap, such as console.log
 * @param {string} [id] - Optional id as prefix, needs a color if used
 * @param {string} [color] - The hex color of the prefix
 * @param {Array} logArguments - Any number of log arguments 
 */
function colorLog(logMethod, name, color) {
    // Binding needed to get proper line numbers/file reference in console
    // Binding needed for console.log.apply to work in IE

    if (name) {
        if (color) {
            return Function.prototype.bind.call(logMethod, console, "%c%s", "color: " + color, name);
        } else {
            return Function.prototype.bind.call(logMethod, console, "%c%s", "color: " + gray, name);
        }
    } else {

        return Function.prototype.bind.call(logMethod, console, "%cWeavy", "color: " + gray);
    }
}

/**
 * @class WeavyConsole
 * @classdesc 
 * Class for wrapping native console logging.
 * - Options for turning on/off logging
 * - Optional prefix by id with color
 **/

/**
 * @constructor
 * @hideconstrucor
 * @param {string|Object} [context] - The unique id displayed by console logging.
 * @param {WeavyConsole#options} [options] - Options for which logging to enable/disable
 */
var WeavyConsole = function (context, options) {

    if(!context) {
        throw new Error("No context defined.")
    }

    if (context instanceof URL) {
        context = context.pathname.split("/").pop() || context.pathname || context.origin || context.hostname;
    }

    var _nameSelf = self.name ? self.name + ":" : "";
    var _nameType = context.type || context.constructor && context.constructor.name || "";
    var _nameInstance = context && context.name ? (_nameType ? "." : "") + context.name : (context.id ? "#" + context.id : "");
    var _name = typeof context === "string" ? _nameSelf + context : _nameSelf + _nameType + _nameInstance;

    var _options = WeavyConsole.defaults;

    // Select a color based on _nameSelf
    var _selectedColor = Array.from(_nameSelf).reduce(function (sum, ch) { return sum + ch.charCodeAt(0); }, 0) % colors.length;
    var _uniqueColor = colors[_selectedColor];

    var _color = gray;

  var noop = function () { };

    /**
    * Enable logging messages in console. Set the individual logging types to true/false or the entire property to true/false;
    *
    * @example
    * console.options = {
    *     log: true,
    *     info: true,
    *     warn: true,
    *     error: true
    * };
    *
    * @name logging
    * @memberof WeavyConsole#
    * @typedef
    * @type {Object}
    * @property {string} color - A hex color to use for id. A random color will be chosen if omitted.
    * @property {boolean} log=true - Enable log messages in console
    * @property {boolean} info=true - Enable info messages in console
    * @property {boolean} warn=true - Enable warn messages in console
    * @property {boolean} error=true - Enable error messages in console
    */
    Object.defineProperty(this, "options", {
        get: function () {
            return _options;
        },
        set: function (options) {
            // Merge default options, current options and new options
            _options = Object.assign({}, WeavyConsole.defaults, _options, options);

            // Set color
            if (_options === true) {
                _color = _uniqueColor;
            } else if (_options.color === false) {
                _color = gray;
            } else if (typeof _options.color === "string") {
                _color = _options.color;
            } else {
                _color = _uniqueColor;
            }

            // Level grouping according to https://console.spec.whatwg.org/#loglevel-severity

            // Turn on/off logging
            let levelLog = _options === true || _options.log;
            let levelInfo = _options === true || _options.info;
            let levelWarn = _options === true || _options.warn;
            let levelError = _options === true || _options.error;

            this.log = levelLog ? colorLog(window.console.log, _name, _color) : noop;
            this.debug = levelLog ? colorLog(window.console.debug, _name, _color) : noop;
            this.info = levelInfo ? colorLog(window.console.info, _name, _color) : noop;
            this.warn = levelWarn ? colorLog(window.console.warn, _name, _color) : noop;
            this.error = levelError ? colorLog(window.console.error, _name, _color) : noop;
            
            // Additional debug logging
            this.assert = levelError ? Function.prototype.bind.call(console.assert, console) : noop;
            this.count = levelLog ? Function.prototype.bind.call(console.count, console) : noop;
            this.countReset = levelLog ? Function.prototype.bind.call(console.countReset, console) : noop;
            this.dir = levelLog ? Function.prototype.bind.call(console.dir, console) : noop;
            this.dirxml = levelLog ? Function.prototype.bind.call(console.dirxml, console) : noop;
            this.table = levelLog ? Function.prototype.bind.call(console.table, console) : noop;
            this.time = levelLog ? Function.prototype.bind.call(console.time, console) : noop;
            this.timeEnd = levelLog ? Function.prototype.bind.call(console.timeEnd, console) : noop;
            this.timeLog = levelLog ? Function.prototype.bind.call(console.timeLog, console) : noop;
            this.trace = levelLog ? Function.prototype.bind.call(console.trace, console) : noop;

            // Additional functions
            this.clear = Function.prototype.bind.call(console.clear, console);
            this.group = Function.prototype.bind.call(console.group, console);
            this.groupCollapsed = Function.prototype.bind.call(console.groupCollapsed, console);
            this.groupEnd = Function.prototype.bind.call(console.groupEnd, console);
        }
    });

    // Set initial logging
    this.options = options;
};

/**
 * Default class options, may be defined in weavy options.
 * 
 * @example
 * Weavy.defaults.console = {
 *     color: true,
 *     log: true,
 *     info: true,
 *     warn: true,
 *     error: true
 * };
 * 
 * @name defaults
 * @memberof WeavyConsole
 * @type {Object}
 * @property {boolean} log=true - Enable log messages in console
 * @property {boolean} info=true - Enable info messages in console
 * @property {boolean} warn=true - Enable warn messages in console
 * @property {boolean} error=true - Enable error messages in console
 */
WeavyConsole.defaults = {
    color: true,
    log: WEAVY_DEVELOPMENT,
    info: true,
    warn: true,
    error: true
};

export default WeavyConsole;


/**
 * @external "console.debug"
 * @see https://developer.mozilla.org/en-US/docs/Web/API/Console/debug
 */

/**
 * @external "console.error"
 * @see https://developer.mozilla.org/en-US/docs/Web/API/Console/error
 */

/**
 * @external "console.info"
 * @see https://developer.mozilla.org/en-US/docs/Web/API/Console/info
 */

/**
 * @external "console.log"
 * @see https://developer.mozilla.org/en-US/docs/Web/API/Console/log
 */

/**
 * @external "console.warn"
 * @see https://developer.mozilla.org/en-US/docs/Web/API/Console/want
 */
