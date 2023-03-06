import Weavy from '../weavy';
import WeavyPostal from '../utils/postal-parent';

/**
 * Filepicker plugin for attaching from Google, O365, Dropbox etc.
 * It listens to `request:origin` messages from frames and responds to the source with a `origin` message containing the `window.location.origin`.
 * 
 * _This plugin has no exposed properties or options._
 * 
 * @mixin FileBrowserPlugin
 * @param {Weavy} weavy - The Weavy instance
 * @parm {Object} options - Plugin options
 * @returns {Weavy.plugins.filebrowser}
 * @typicalname weavy.plugins.filebrowser
 */
class FileBrowserPlugin {
  constructor(weavy, options) {
    var fileBrowserUrl = new URL(options.url);
    var fileBrowserOrigin = fileBrowserUrl.origin;
    
    weavy.panels.origins.add(fileBrowserOrigin);

    var panelData = null;
    var origin = '';
    
    // Get top origin
    try {
      if (window.location.ancestorOrigins && 0 < window.location.ancestorOrigins.length) {
        // Not available in FF, but Google APIs use this
        origin = window.location.ancestorOrigins[window.location.ancestorOrigins.length - 1];
      } else {
        // This may fail due to cors
        origin = window.top.document.location.origin;
      } 
    } catch(e) { /* No worries */}
    
    if (!origin) {
      try {
        origin = window.self.document.location.origin;
      } catch(e) {
        weavy.error("Filebrowser: Could not read current origin.");
      }
    }

    var filebrowser;

    var loadFilebrowser = function () {
      let filebrowserOptions = {};
      filebrowserOptions.url = fileBrowserUrl.href + "?origin=" + origin + "&v=X&t=" + Date.now().toString() + "&weavyId=" + weavy.getId();
      filebrowserOptions.overlayId = "filebrowser";
      filebrowserOptions.type = "filebrowser";
      filebrowserOptions.className = "wy-modal";
      filebrowserOptions.title = "Add file from cloud";

      weavy.log("filebrowser-open", filebrowserOptions);

      let overlayFilebrowser = weavy.overlays.overlay(filebrowserOptions);

      filebrowserInit(overlayFilebrowser);

      if (filebrowser.location && filebrowser.location !== filebrowserOptions.url) {
          filebrowser.reset();
      }

      filebrowser.open(filebrowserOptions.url);

      return filebrowser;
    }

    function filebrowserInit(panel) {
      if (panel !== filebrowser) {
        weavy.debug("init filebrowser");

        filebrowser = panel;

        filebrowser.node.classList.remove("wy-modal-full");

        filebrowser.on("message", (e, message) => {
          if (message.name === "google-selected") {
            filebrowser.node.classList.add("wy-modal-full");
          }
        })
  
        filebrowser.on("before:panel-close", () => {
          filebrowser.loadingStarted(true);
        })

        filebrowser.on("after:panel-close", () => {
          filebrowser.node.classList.remove("wy-modal-full");
        })
      }
    }

    weavy.on("panel-added", (e, panelAdded) => {
      if (panelAdded.attributes.type === "filebrowser") {
        filebrowserInit(panelAdded.panel)
      }
    })

    weavy.on(WeavyPostal, "add-external-blobs", weavy.getId(), function (e) {
      // Bounce to app
      if (panelData) {
        WeavyPostal.postToSource(panelData, e.data);
      }
    });

    weavy.on(WeavyPostal, "request:file-browser-open", weavy.getId(), function (e) {
      // Remember app source
      panelData = e;
      filebrowser = loadFilebrowser();
    });
    
    weavy.on(WeavyPostal, "request:file-browser-close", weavy.getId(), function (e) {          
      filebrowser?.close();
      // Bounce to app
      if (panelData) {
        WeavyPostal.postToSource(panelData, Object.assign({}, e.data, { name: "file-browser-closed"}));
      }
    });
  }
}

/**
 * Default plugin options
 * 
 * @example
 * Weavy.plugins.filebrowser.defaults = {
 * };
 * 
 * @ignore
 * @name defaults
 * @memberof FileBrowserPlugin
 * @type {Object}
 */
FileBrowserPlugin.defaults = {
  url: "https://filebrowser.weavy.io/v14/",
};

// Register and return plugin
//console.debug("Registering Weavy plugin: filebrowser");
Weavy.plugins.filebrowser = FileBrowserPlugin;

export default FileBrowserPlugin;
