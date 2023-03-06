import Weavy from '../weavy';

/**
 * Describe your plugin.
 * 
 * @mixin MyPlugin
 * @param {Weavy} weavy - The Weavy instance
 * @param {Object} options - Plugin options
 * @returns {Weavy.plugins.myplugin}
 */
class MyPlugin {
    constructor(weavy, options) {
        // MY CUSTOM CODE
        // ...
    }
}

/**
 * Default plugin options
 * 
 * @example
 * Weavy.plugins.MyPlugin.defaults = {
 * };
 * 
 * @name defaults
 * @memberof MyPlugin
 * @type {Object}
 */
MyPlugin.defaults = {
};

/**
 * Non-optional dependencies.
 * 
 * @name dependencies
 * @memberof MyPlugin
 * @type {string[]}
 */
MyPlugin.dependencies = [];


// Register and return plugin
console.debug("Registering Weavy plugin: myplugin");
Weavy.plugins.myplugin = MyPlugin;
export default MyPlugin
