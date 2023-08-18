import { assign, eqString } from "../utils/objects";
import WeavyPromise from "../utils/promise";
import WeavyConsole from "../utils/console";
import { MixinWeavyEvents } from "../utils/events";
import WeavyPanel from "./panel";
import WeavyRoot from "./dom-root";
import WeavyOverlays from "./overlays";
import Weavy from "../weavy";
import WeavyStyles, { applyStyleSheet, moveImportsToTop } from "./styles";
import FileBrowser from "./filebrowser";
import { classNamesConcat } from "../utils/dom";

const console = new WeavyConsole("App");
//console.debug("app.js");

const appUrl = "/dropin/client/app";

/**
 * @class WeavyApp
 * @classdesc Base class for representation of apps in Weavy.
 * @example
 * var app = new WeavyApp({ uid: "myapp1", type: "posts" });
 */
export default class WeavyApp extends MixinWeavyEvents(HTMLElement) {
  static defaults = {
    load: true,
  };

  static get observedAttributes() {
    return ["class", "load", "uid", "css"];
  }

  attributeChangedCallback(name, oldValue, newValue) {
    if (name === "class") {
      this.whenBuilt().then(() => {
        this.root.className = newValue;
        this.panel.className = newValue;
        this.overlays.className = newValue;
      });
    }

    if (name === "css") {
      this.css = newValue;
      this.whenBuilt().then(() => {
        this.panel.postStyles()
      })
    }
  }

  /**
   * The weavy console logging.
   */
  get console() {
    return console;
  }

  /**
   * The uid of the app, defined in options.
   * @category properties
   * @type {string}
   */
  get uid() {
    return this.getAttribute("uid");
  }

  set uid(uid) {
    this.setAttribute("uid", uid);
  }

  get autoLoad() {
    return this.getAttribute("load") !== "false";
  }

  set autoLoad(val) {
    if (val === false) {
      this.setAttribute("load", "false");
    } else if (val) {
      this.setAttribute("load", val);
    } else {
      this.removeAttribute("load");
    }
  }

  /**
   * General CSS className.
   *
   * @member className
   * @memberof WeavyApp#
   * @type {string}
   **/
  get className() {
    return this.getAttribute("class") || "";
  }

  set className(className) {
    if (className) {
      this.setAttribute("class", className);
    } else {
      this.removeAttribute("class");
    }
  }

  /**
   * The {@link Weavy} instance the app belongs to.
   * @category properties
   * @type {Weavy}
   */
  #environment;

  get environment() {
    return this.#environment || Weavy.environment;
  }

  /**
   * List of all current defined apps as an Array.
   * @category apps
   * @type {Array.<WeavyApp>}
   **/
  static #apps = [];

  /**
   * Options for defining the app. Type is required.
   *
   * @example
   * weavy.app({
   *   uid: "myid",
   *   name: "Posts",
   *   type: "posts",
   *   container: "#myappcontainer",
   *   className: "wy-dark",
   *   css: ":root { --wy-theme-color: #ff0000; }"
   * });
   *
   * @category options
   * @typedef
   * @member
   * @type {Object}
   * @property {string} uid - The uid representing the app in the context environment.
   * @property {string} name - The display name of the app.
   * @property {Element|string} container - The container where the app should be placed.
   * @property {string} type - The kind of app. <br> • posts <br> • files <br> • messenger <br> • notifications <br> • comments <br> • chat
   * @property {string} className - Custom className to add to the app.
   * @property {string} css - Custom CSS to add to the app.
   * @property {boolean} [shadowMode=closed] - Set whether ShadowDOMs should be `closed` (recommended) or `open`.
   * @property {string} [filebrowser=https://filebrowser.weavy.io/v14/] - The url to the filebrowser.
   */
  options = {};

  /**
   * The server data for the app.
   *
   * @example
   * {
   *   uid: "files",
   *   url: "/e/apps/2136",
   *   type: "files"
   * }
   *
   * @category properties
   * @typedef
   * @member
   * @type {Object}
   * @property {string} uid - The uid for the app.
   * @property {string} url - The base url to the app.
   * @property {string} type - The type of the app.
   */
  data;

  /**
   * The root object for the container of the app.
   * @category properties
   * @type {Object}
   * @property {Element} container - The inner container to put nodes in.
   * @property {string} id - The id of the root
   * @property {Element} parent - The element defined in options to contain the app.
   * @property {ShadowRoot} root - The isolated ShadowRoot in the section.
   * @property {Element} section - The &lt;weavy&gt;-section within the parent.
   * @property {Function} remove() - Method for removing the root from the DOM.
   */
  root = null;

  /**
   * The root object for the overlays of the app.
   * @category properties
   * @type {Object}
   * @property {Element} container - The inner container to put nodes in.
   * @property {string} id - The id of the root
   * @property {Element} parent - The element defined in options to contain the app.
   * @property {ShadowRoot} root - The isolated ShadowRoot in the section.
   * @property {Element} section - The &lt;weavy&gt;-section within the parent.
   * @property {Function} remove() - Method for removing the root from the DOM.
   */
  overlayRoot = null;

  /**
   * The Panel displaying the app.
   * @category properties
   * @type {WeavyPanels~panel}
   */
  panel = null;

  overlays;
  filebrowser;

  /**
   * Internal appId. Either uid or type
   */
  #appId;

  /**
   * The url of the app, received from app data.
   * @category properties
   * @type {string}
   */
  url = null;

  /**
   * The name of the app, defined in options or received from app data.
   * @category properties
   * @type {string}
   */
  name = null;

  /**
   * The short readable type of the app, such as "files".
   * @category properties
   * @type {string}
   */
  type = null;

  /**
   * Has the app initialized on the server?
   * @category properties
   * @type {boolean}
   */
  isInitialized = false;

  /**
   * Has the app been built?
   * @category properties
   * @type {boolean}
   */
  isBuilt = false;

  /**
   * Has the app loaded?
   * @category properties
   * @type {boolean}
   */
  get isLoaded() {
    return this.panel ? this.panel.isReady : false;
  }

  // CSS
  #styles;

  /**
   * General CSS styles.
   *
   * @member css
   * @memberof WeavyApp#
   * @type {string}
   **/
  get css() {
    return this.#styles.css;
  }

  set css(css) {
    this.#styles.css = css;
  }

  // PROMISES

  /**
   * Promise that resolves when the app has been initialized on the server.
   *
   * @category promises
   * @type {WeavyPromise}
   */
  whenInitialized = new WeavyPromise();

  /**
   * Promise that resolves when the app is built.
   *
   * @category promises
   * @type {WeavyPromise}
   */
  whenBuilt = new WeavyPromise();

  /**
   * Promise that resolves when the app is loaded and ready.
   *
   * @category promises
   * @type {WeavyPromise}
   */
  whenLoaded = new WeavyPromise();

  /**
   * This class is automatically instantiated when defining apps in weavy.
   * All the methods and properties are accessible in each instance.
   * The passed options will fetch the app or create it.
   *
   * @constructor
   * @hideconstructor
   * @param {WeavyApp#options} options - App options
   * @param {Object} [data] - Initial data belonging to the app
   */
  constructor(options, data) {
    super();

    this.options = assign(
      assign(Weavy.defaults, WeavyApp.defaults, true),
      options,
      true
    );

    console.options = this.options.console;

    console.debug("new WeavyApp", options);

    if (data) {
      this.data = data;
    }

    this.#styles = new WeavyStyles(this);
    this.#styles.eventParent = this;

    if (this.hasAttribute("css")) {
      this.#styles.css = this.getAttribute("css");
    } else if (this.options.styles !== undefined) {
      this.#styles.css = this.options.css;
    }

    this.#styles.on("styles-update", async () => {
      await this.whenBuilt();
      for (const styleSheetName in this.#styles.styleSheets) {
        let styleSheet = this.#styles.styleSheets[styleSheetName];
        applyStyleSheet(this.root.dom, styleSheet);
        applyStyleSheet(this.overlayRoot.dom, styleSheet);
      }
      this.panel.postStyles();
    });

    // Set id

    this.#appId = this.uid || this.type || this.options.uid || this.options.type;

    try {
      this.root = new WeavyRoot(this);
      this.root.className = this.className;
    } catch (e) {
      console.warn("could not create app root in container:", this.#appId, e);
    }

    try {
      this.overlayRoot = new WeavyRoot(this);
      this.overlayRoot.className = this.className;
    } catch (e) {
      console.warn(
        "could not create app overlays root in container:",
        this.#appId,
        e
      );
    }

    Weavy.whenReady().then(() => {
      this.configure();

      this.options = assign(
        assign(Weavy.defaults, WeavyApp.defaults, true),
        options,
        true
      );

      this.environment.on("history-restore", (state) => {
        console.log("history-restore", state);
        this.openBrowserState(state);
      });

    });

    // CONSTRUCTOR END
  }

  connectedCallback() {
    this.configure();

    this.root.className = this.className;
    this.overlayRoot.className = this.className;

    this.append(this.root.root);
    document.documentElement.append(this.overlayRoot.root);

    if (this.hasAttribute("css")) {
      this.css = this.getAttribute("css");
    }

    // CONFIGURE
    Weavy.whenReady().then(() => {
      this.#styles.updateStyles();

      this.fetchOrCreate();

      console.log("hey", this.autoLoad)

      if (!this.isLoaded && this.autoLoad !== false) {
        this.load(null, true);
      }
    })
  }

  /**
   * Configure the app with options or data. If the app has data it will also be built.
   * Currently existing options are extended with new options.
   * Data will resolve {@link WeavyApp#whenInitialized} promise.
   *
   * @category methods
   * @function
   * @param {WeavyApp#options} options
   * @param {WeavyApp#data} data
   * @resolves {WeavyApp#whenInitialized}
   */
  async configure(options, data) {
    if (options && typeof options === "object") {
      this.options = assign(this.options, options, true);
    }

    if (data && typeof data === "object") {
      this.data = data;
    }

    if (this.options && typeof this.options === "object") {
      if (this.options.load === false) {
        this.autoLoad = false;
      }
  
      if (this.options.className !== undefined && this.options.className !== null) {
        this.className = classNamesConcat(this.options.className, this.className);
      }

      if (this.uid === null && this.options.uid) {
        this.uid = this.options.uid;
      }

      if (this.name === null && this.options.name) {
        this.name = this.options.name;
      }

      if (this.type === null && this.options.type) {
        this.type = this.options.type;
      }

      this.#appId = this.uid || this.type;
    }

    if (this.data && typeof this.data === "object") {
      if (!this.uid && this.data.uid) {
        this.uid = this.data.uid;
      }

      if (this.url === null && this.data.url) {
        this.url = new URL(this.data.url, this.environment.url);
      }

      this.#appId = this.uid || this.type;

      this.isInitialized = true;

      /**
       * Triggered when the app data has been fetched from the server.
       *
       * @category events
       * @event WeavyApp#app-load
       * @returns {Object}
       * @property {WeavyApp} app - The app that fires the event
       */
      this.triggerEvent("app-init");

      this.whenInitialized.resolve();
    }
  }

  /**
   * Sets options and fetches (or creates) the app on the server. Options will replace existing options.
   * When data is fetched, the {@link WeavyApp#whenInitialized} promise is resolved.
   *
   * @category methods
   * @function
   * @param {WeavyApp#options} [options] - Optional new app options
   * @returns {WeavyApp#whenInitialized}
   * @resolves {WeavyApp#whenInitialized}
   */
  async fetchOrCreate() {
    var initAppUrl = new URL(appUrl, this.environment.url);

    try {
      let data = await this.environment.fetch(
        initAppUrl,
        { uid: this.uid, type: this.type },
        "POST"
      );
      this.data = data;
    } catch (error) {
      console.error("fetchOrCreate() failed", error);
      this.whenInitialized.reject(error);
      throw new Error(error);
    }

    await this.configure();
    await this.build();
  }

  /**
   * Builds the app. Creates a shadow root and a panel. Is executed on the {@link Weavy#event:build} event.
   *
   * @category methods
   * @function
   * @resolves {WeavyApp#whenBuilt}
   */
  async build() {
    if (!this.isBuilt && this.isInitialized) {
      this.isBuilt = true;
      //await this.whenInitialized();
      
      console.debug("build()")

      /**
       * Instance of the overlay manager for all overlays in the weavy instance.
       *
       * @type {WeavyPanels}
       * @category panels
       **/
      this.overlays = new WeavyOverlays(this.environment, this.overlayRoot, this);
      this.overlays.className = this.className;

      this.on("panel-css", (eventCss) => {
        eventCss.css = moveImportsToTop([eventCss.css, this.#styles.getAllCSS()]
          .filter((s) => s)
          .join("\n"));
      });

      this.on("overlay-open", (overlayOptions) => {
        var overlay = this.overlays.getOverlay(overlayOptions);

        //if (overlay.location && overlay.location !== overlayOptions.url) {
        //this.#reset(overlay);
        //}
        overlay.open(overlayOptions.url);
      });

      this.on("before:navigate", (request) => {
        console.log("before:navigate", request);
        this.#openRequest(request);
        return false;
      });

      this.on("overlay-history-add", ({ action, states }) => {
        this.environment.setHistory(action, {
          id: "overlays-" + this.#appId,
          overlays: states,
        });
      });

      this.filebrowser = new FileBrowser(this.environment, this.overlays);

      // TODO: UNREGISTER
      this.environment.authentication.on("signed-in", async () => {
        if (this.isLoaded) {
          // Reopen on sign in
          this.load(null, true);
        }
      });
      var panelId = "app-" + this.#appId;

      this.panel = new WeavyPanel();
      this.panel.configure(
        this.environment,
        panelId,
        this.url,
        { className: this.className },
        this
      );
      this.root.container.appendChild(this.panel.node);

      this.panel.on("panel-history-add", ({ action, state }) => {
        state.id = this.#appId;
        this.environment.setHistory(action, state);
      });

      /**
       * Triggered when the app panel is opened.
       *
       * @category events
       * @event WeavyApp#app-open
       * @returns {Object}
       * @property {WeavyApp} app - The app that fires the event
       * @extends WeavyPanel#event:panel-open
       */
      this.panel.on("panel-open", (data) =>
        this.triggerEvent("app-open", data)
      );

      /**
       * Triggered when the app receives a postMessage sent from the panel frame.
       *
       * @category events
       * @event WeavyApp#message
       * @returns {Object}
       * @property {WeavyApp} app - The app that fires the event
       * @extends WeavyPanels#event:message
       */
      this.on("before:message", (message) => {
        if (message.panelId === panelId) {
          return assign(message, { app: this });
        }
      });

      this.panel.whenReady().then(() => {
        /**
         * Triggered when the app has loaded it's contents.
         *
         * @category events
         * @event WeavyApp#app-load
         * @returns {Object}
         * @property {WeavyApp} app - The app that fires the event
         */
        this.triggerEvent("app-load");

        this.whenLoaded.resolve();
      });

      this.panel.on("message", (message, event) => {
        if (
          message.name === "request:file-browser-open" &&
          message.panelId === panelId
        ) {
          console.log("request:file-browser-open");
          // Remember app source
          this.filebrowser.loadFilebrowser(event);
        }
      });

      /**
       * Triggered when the app panel is built.
       *
       * @category events
       * @event WeavyApp#app-build
       * @returns {Object}
       * @property {WeavyApp} app - The app that fires the event
       */
      this.triggerEvent("app-build");

      this.whenBuilt.resolve();
    }
  }

  /**
   * Tries to open a navigation request.
   *
   * @param {WeavyNavigation~navigationRequest} request - The navigation request object to open
   * @returns {Promise}
   * @resolved When the request successfully is opened
   * @rejected When the request can't be opened
   */
  async #openRequest(request) {
    if (request.target) {
      console.log(
        "App " + this.#appId + " opening " + request.target + " url in overlay"
      );
      return await this.overlays.open(request);
    } else if (request.url) {
      // open by matching url
      let urlSelector = { url: new URL(request.url, this.environment.url) };

      await this.whenLoaded();

      let appMatch = this.match(urlSelector);

      if (appMatch) {
        console.log("found matching navigation app by url");
        this.overlays.closeAll(true);

        return await this.load(request.url);
      } else {
        console.info("requested app did not match");
      }
    }
  }

  /**
   * Opens the app panel and optionally loads a destination url after waiting for {@link WeavyApp#whenBuilt}.
   *
   * @category panel
   * @function WeavyApp#open
   * @param {string} [destination] - Destination url to navigate to on open
   * @returns {Promise}
   */
  async load(destination, noHistory) {
    await Promise.all([
      this.whenInitialized(),
      this.whenBuilt(),
      this.environment.whenReady(),
    ]);
    console.log("autoloading")
    await this.panel.open(destination, noHistory);
  }

  /**
   * Resets the app panel.
   *
   * @category panel
   * @function WeavyApp#reset
   * @returns {Promise}
   * */
  async reset() {
    await Promise.all([this.whenBuilt(), this.environment.whenReady()]);
    await this.panel.reset();
  }

  /**
   * Removes the app in the client and the DOM. The app will not be removed on the server and can be added and fetched at any point again.
   *
   * @category methods
   * @function WeavyApp#remove
   * @returns {Promise}
   */
  async remove() {
    console.debug("Removing app", this.uid);

    if (this.panel) {
      await this.panel.remove(null, true);
    }

    /*if ('getRoot' in this.#weavy) {
      let appRootId = "app-root-" + (this.uid || this.type);
      var appRoot = this.#weavy.getRoot(appRootId);

      if (appRoot) {
        appRoot.remove();
      }
    }*/

    WeavyApp.#apps = WeavyApp.#apps.filter((a) => {
      return !a.match(this);
    });
  }

  /**
   * Restores all the matching panels in a weavy state.
   * It will open or close the panels and restore their location.
   * It will not generate any new history.
   *
   * @param {WeavyHistory~weavyState} state - The state to restore
   * @returns {Promise}
   */
  async openBrowserState(browserState) {
    if (browserState) {
      await this.whenBuilt();

      this.overlays.closeAll(true);

      if (browserState && Object.keys(browserState).length) {
        var waitForPanels = [];

        console.debug("history: opening state", browserState);

        for (var stateId in browserState) {
          if (Object.prototype.hasOwnProperty.call(browserState, stateId)) {
            var state = browserState[stateId];
            console.log("checking history state", stateId);
            if (state.id === "overlays-" + this.#appId) {
              console.log("found overlay history", state.overlays?.length);
              if (state.overlays?.length) {
                state.overlays.forEach((overlayState) => {
                  console.log("restoring overlay history", overlayState);
                  waitForPanels.push(this.overlays.openState(overlayState));
                });
              }
            } else {
              if (state.id === this.#appId) {
                //await this.whenBuilt();
                console.debug("history: setting panel state", state.panelId);
                waitForPanels.push(this.panel.setState(state));
              }
            }
          }
        }

        await Promise.all(waitForPanels);
      }
    }
  }

  /**
   * Sends postMessage to the app panel frame.
   * Returns a promise that is resolved when the message has been delivered and rejected if the message fails or has timed out.
   *
   * @category panel
   * @function WeavyApp#postMessage
   * @param {object} message - The Message to send
   * @param {Transferable[]} [transfer] - A sequence of Transferable objects that are transferred with the message.
   * @see {@link https://developer.mozilla.org/en-US/docs/Web/API/Window/postMessage}
   * @returns {Promise}
   * */
  async postMessage(message, transfer) {
    await this.whenBuilt();
    await this.panel.postMessage(message, transfer);
  }

  /**
   * Check if another app or an object is matching this app. It checks for a match of the uid property or matching the url property against the base url.
   *
   * @category methods
   * @function WeavyApp#match
   * @param {WeavyApp|Object} options
   * @param {int} [options.uid] - Optional uid to match.
   * @param {int} [options.type] - Optional type to match when no uid is provided.
   * @param {URL} [options.url] - Optional URL to match against base path of the app.
   * @returns {boolean}
   */
  match(options) {
    if (options) {
      if (options.uid && this.uid) {
        return eqString(options.uid, this.uid);
      }

      if (options.type && this.type && !this.uid) {
        return eqString(options.type, this.type);
      }

      if (options.url && this.url) {
        let optionsUrl = new URL(options.url);
        let appUrl = new URL(this.url);
        let exactMatch = optionsUrl.href === appUrl.href;

        // app.url might end without slash
        if (!appUrl.pathname.endsWith("/")) {
          appUrl.pathname += "/";
        }
        let baseMatch = optionsUrl.href.startsWith(appUrl.href);

        return exactMatch || baseMatch;
      }
    }

    return false;
  }

  // CLASS END
}

window.customElements.define("weavy-app", WeavyApp);
