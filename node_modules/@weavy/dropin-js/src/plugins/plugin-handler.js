import { assign, isPlainObject } from '../utils/objects';
import WeavyConsole from '../utils/console';

const console = new WeavyConsole("weavy.plugins");

export default function (Weavy, weavy) {
  /**
   * All enabled plugins are available in the plugin list. Anything exposed by the plugin is accessible here.
   * You may use this to check if a plugin is enabled and active.
   *
   * Set plugin options and enable/disable plugins using {@link Weavy#options}.
   *
   * @example
   * if (weavy.plugins.toast) {
   *   weavy.plugins.toast.toast("Alert plugin is enabled");
   * }
   *
   * @category plugins
   * @type {Object.<string, plugin>}
   */
  weavy.plugins = {};

  var _unsortedDependencies = {};
  var _sortedDependencies = [];
  var _checkedDependencies = [];

  function sortByDependencies(pluginName) {
    if (!pluginName) {
      for (plugin in _unsortedDependencies) {
        sortByDependencies(plugin);
      }
    } else {
      if (
        Object.prototype.hasOwnProperty.call(_unsortedDependencies, pluginName)
      ) {
        var plugin = _unsortedDependencies[pluginName];
        if (plugin.dependencies.length) {
          plugin.dependencies.forEach(function (dep) {
            // Check if plugin is enabled
            if (typeof Weavy.plugins[dep] !== "function") {
              console.error(
                "plugin dependency needed by " +
                  pluginName +
                  " is not loaded/registered:",
                dep
              );
            } else if (
              !(
                (weavy.options.includePlugins &&
                  weavy.options.plugins[dep] !== false) ||
                (!weavy.options.includePlugins && weavy.options.plugins[dep])
              )
            ) {
              console.error(
                "plugin dependency needed by " + pluginName + " is disabled:",
                dep
              );
            }

            if (_checkedDependencies.indexOf(dep) === -1) {
              _checkedDependencies.push(dep);
              sortByDependencies(dep);
            } else {
              console.error(
                "You have circular Weavy plugin dependencies:",
                pluginName,
                dep
              );
            }
          });
        }

        if (
          Object.prototype.hasOwnProperty.call(
            _unsortedDependencies,
            pluginName
          )
        ) {
          _sortedDependencies.push(_unsortedDependencies[pluginName]);
          delete _unsortedDependencies[pluginName];
          _checkedDependencies = [];
          return true;
        }
      }
    }

    return false;
  }

  // Disable all plugins by setting plugin option to false
  if (weavy.options.plugins !== false) {
    weavy.options.plugins = weavy.options.plugins || {};

    for (plugin in Weavy.plugins) {
      if (typeof Weavy.plugins[plugin] === "function") {
        // Disable individual plugins by setting plugin options to false
        if (
          (weavy.options.includePlugins &&
            weavy.options.plugins[plugin] !== false) ||
          (!weavy.options.includePlugins && weavy.options.plugins[plugin])
        ) {
          _unsortedDependencies[plugin] = {
            name: plugin,
            dependencies: Array.isArray(Weavy.plugins[plugin].dependencies)
              ? Weavy.plugins[plugin].dependencies
              : [],
          };
        }
      } else {
        console.error(
          "Registered plugin is not a plugin",
          plugin,
          typeof Weavy.plugins[plugin]
        );
      }
    }

    // Sort by dependencies
    sortByDependencies();

    for (var sortedPlugin in _sortedDependencies) {
      var plugin = _sortedDependencies[sortedPlugin].name;

      console.debug("Running Weavy plugin:", plugin);

      // Extend plugin options
      weavy.options.plugins[plugin] = assign(
        Weavy.plugins[plugin].defaults,
        isPlainObject(weavy.options.plugins[plugin])
          ? weavy.options.plugins[plugin]
          : {},
        true
      );

      // Run the plugin
      weavy.plugins[plugin] =
        new Weavy.plugins[plugin](weavy, weavy.options.plugins[plugin]) || true;
    }
  }
}
