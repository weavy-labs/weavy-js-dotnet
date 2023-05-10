import WeavyPostal from '../utils/postal-parent';
import WeavyConsole from '../utils/console';

const console = new WeavyConsole("Filebrowser")

/**
 * Filepicker plugin for attaching from Google, O365, Dropbox etc.
 * It listens to `request:origin` messages from frames and responds to the source with a `origin` message containing the `window.location.origin`.
 * 
 * _This plugin has no exposed properties or options._
 * 
 * @mixin FileBrowserPlugin
 * @param {Weavy} weavy - The Weavy instance
 * @parm {Object} options - Plugin options
 */
export default class FileBrowser {
  #environment;

  #overlays;

  #filebrowser;
  #url;

  #windoworigin = '';

  #panelSource = null;

  constructor(environment, overlays, options) {

    this.#environment = environment;
    this.#overlays = overlays;

    this.#url = new URL(options?.url || this.#environment.options.defaults.filebrowser);
    
    // Get top origin
    try {
      if (window.location.ancestorOrigins && 0 < window.location.ancestorOrigins.length) {
        // Not available in FF, but Google APIs use this
        this.#windoworigin = window.location.ancestorOrigins[window.location.ancestorOrigins.length - 1];
      } else {
        // This may fail due to cors
        this.#windoworigin = window.top.document.location.origin;
      } 
    } catch(e) { /* No worries */}
    
    if (!this.#windoworigin) {
      try {
        this.#windoworigin = window.self.document.location.origin;
      } catch(e) {
        console.error("Could not read current origin.");
      }
    }

    // CONSTRUCTOR END
  }

  loadFilebrowser(event) {
    if (event) {
      this.#panelSource = event;
    }

    console.log("Loading file browser")

    let filebrowserOptions = {};
    filebrowserOptions.url = this.#url.href + "?origin=" + this.#windoworigin + "&v=X&t=" + Date.now().toString() + "&weavyId=" + this.#environment.getId();
    filebrowserOptions.overlayId = "filebrowser";
    filebrowserOptions.type = "filebrowser";
    filebrowserOptions.className = "wy-modal";
    filebrowserOptions.title = "Add file from cloud";

    let overlayFilebrowser = this.#overlays.getOverlay(filebrowserOptions);

    this.filebrowserInit(overlayFilebrowser);

    if (this.#filebrowser.location && this.#filebrowser.location !== filebrowserOptions.url) {
        this.#filebrowser.reset();
    }

    this.#filebrowser.open(filebrowserOptions.url);
  }

  filebrowserInit(panel) {
    if (panel !== this.#filebrowser) {
      this.#filebrowser = panel;

      this.#filebrowser.node.classList.remove("wy-modal-full");

      this.#filebrowser.on("message", (message, event) => {
        if (message.name === "google-selected") {
          this.#filebrowser.node.classList.add("wy-modal-full");
        }

        if (message.name === "add-external-blobs"){
          // Bounce to app
          if (this.#panelSource) {
            WeavyPostal.postToSource(this.#panelSource, message);

            // Also close, since any errors are shown in the app
            this.#filebrowser?.close();
          }
        }

        if (message.name === "request:file-browser-close") {
          this.#filebrowser?.close();
          // Bounce to app
          if (this.#panelSource) {
            WeavyPostal.postToSource(this.#panelSource, Object.assign({}, message, { name: "file-browser-closed"}));
          }
        }
      })

      this.#filebrowser.on("before:panel-close", () => {
        this.#filebrowser.loadingStarted(true);
      })

      this.#filebrowser.on("after:panel-close", () => {
        this.#filebrowser.node.classList.remove("wy-modal-full");
      })
    }
  }
}