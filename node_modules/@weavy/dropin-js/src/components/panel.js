import WeavyPromise from "../utils/promise";
import { isPlainObject, assign } from "../utils/objects";
import WeavyPostal from "../utils/postal-parent";
import { whenTimeout } from "../utils/timeout";
import WeavyConsole from "../utils/console";
import { MixinWeavyEvents } from "../utils/events";

const console = new WeavyConsole("Panel");

//console.debug("panels.js");

/**
 * Wrapped iframe with event handling, states, preloading and postMessage communication.
 *
 * @type {HTMLElement}
 * @property {string} id - Unique id for the container. Using panelId processed with {@link Weavy#getId}.
 * @property {string} panelId - Unprocessed id for the panel.
 * @property {string} className - DOM class: "panel".
 * @property {string} [dataset.type] - Any provided type.
 * @property {boolean} [dataset.persistent] - Will the panel remain when {@link WeavyPanels~panel#remove} or {@link WeavyPanels#clearPanels} are called?
 * @property {boolean} [dataset.preload] - Should the panel be preloaded when idle
 * @property {IFrame} frame - Reference to the child iframe
 * @property {string} frame.id - Id of the iframe
 * @property {string} frame.className - DOM class: "weavy-panel-frame"
 * @property {string} frame.name - Window name for the frame
 * @property {string} frame.dataset.src - The original url for the panel.
 * @property {string} frame.dataset.weavyId - The id of the weavy instance the frame belongs to. Provided for convenience.
 * @property {string} [frame.dataset.type] - Any provided type.
 * @property {boolean} isOpen - Get if the panel is open.
 * @property {boolean} isLoading - Get if the panel is loading. Set to true to visually indicate that the panel is loading. Set to false to turn off the visual indication.
 * @property {boolean} isLoaded - Get if the panel is loaded. Set to true to visually indicate that the panel is loading. Set to false to turn off the visual indication.
 **/
export default class WeavyPanel extends MixinWeavyEvents(HTMLElement) {
  #environment;
  #panels;
  #panelsContainer;
  #loadingTimeout;

  panelId;
  attributes;
  node;
  frame;

  /**
   * The weavy console logging.
   */
  get console() {
    return console;
  }
  
  #className = "";

  get className() {
    return this.#className;
  }

  set className(className) {
    this.#className = className;
    this.postStyles();
  }

  location;
  statusCode;
  stateChangedAt;

  #origin;

  /**
   * Check if a panel is currently open
   *
   * @property {boolean} isOpen - True if the panel is open
   */
  get isOpen() {
    return this.node?.classList.contains("wy-open") || false;
  }

  #isLoading = false;

  /**
   * Check if a panel is currently loading.
   *
   * @property {boolean} isLoading - True if the panel currently is loading
   */
  get isLoading() {
    return this.#isLoading;
  }

  #isRegistered = false;

  /**
   * Check if the panel frame is registered.
   *
   * @property {boolean} isRegistered - True if the panel is registered
   */
  get isRegistered() {
    return this.#isRegistered;
  }

  #isReady = false;

  /**
   * Check if the panel frame has received ready.
   *
   * @property {boolean} isReady - True if the panel has received ready
   */
  get isReady() {
    return this.#isReady;
  }

  #isLoaded = false;

  /**
   * Check if a panel has finished loading.
   *
   * @property {boolean} isLoaded - True if the panel has finished loading.
   */
  get isLoaded() {
    return this.#isLoaded;
  }

  whenDOMConnected = new WeavyPromise();

  /**
   * Promise that resolves when the panel iframe has connected via postMessage.
   *
   * @type {WeavyPromise}
   * @name WeavyPanels~panel#whenReady
   * @returns {WeavyPanels~panel} The panel it belongs to
   **/
  whenReady = new WeavyPromise();

  /**
   * Promise that resolves when the panel iframe has fully loaded.
   *
   * @type {WeavyPromise}
   * @name WeavyPanels~panel#whenLoaded
   * @returns {WeavyPanels~panel} The panel it belongs to
   **/
  whenLoaded = new WeavyPromise();

  /**
   * Promise that resolves when the panel iframe is closed.
   *
   * @type {WeavyPromise}
   * @name WeavyPanels~panel#whenClosed
   * @returns {WeavyPanels~panel} The panel it belongs to
   **/
  whenClosed = WeavyPromise.resolve();

  constructor() {
    super();
  }

  // Custom element DOM connected
  connectedCallback() {
    console.log("panel dom connected", this.panelId)
    this.whenDOMConnected.resolve();
  }

  /**
   * Create a {@link WeavyPanels~panel} that has frame handling. If the panel already exists it will return the existing panel.
   *
   * @function
   * @name WeavyPanels~container#addPanel
   * @param {string} panelId - The id of the panel.
   * @param {url} [url] - Optional url. The page will not be loaded until {@link WeavyPanels~panel#preload} or {@link WeavyPanels~panel#open} is called.
   * @param {Object} [attributes] - All panel attributes are optional
   * @param {string} [attributes.type] - Type added as data-type attribute.
   * @param {boolean} [attributes.persistent] - Should the panel remain when {@link WeavyPanels~panel#remove} or {@link WeavyPanels#clearPanels} are called?
   * @param {boolean} [attributes.preload] - Should the panel be preloaded when idle?
   * @emits WeavyPanels#panel-added
   */
  configure(environment, panelId, url, attributes, eventParent) {
    console.log("configuring panel", panelId)

    if (!panelId) {
      throw new Error("new WeavyPanel() is missing panelId");
    }

    this.#environment = environment;
    
    if (!isPlainObject(attributes)) {
      attributes = {};
    }

    // Events
    if (eventParent) {
      this.eventParent = eventParent;
    }

    console.debug("creating panel", panelId);

    this.panelId = panelId;
    this.attributes = attributes;

    if (attributes.origin) {
      this.#origin = attributes.origin;
      console.log(this.panelId, "setting attribute origin", this.#origin)
    } else if (url) {
      this.#origin = new URL(url, this.#environment.url).origin;
      console.log(this.panelId, "setting url/environment origin", this.#origin)
    } else {
      this.#origin = this.#environment.url.origin;
      console.log(this.panelId, "setting environment origin", this.#origin)
    }

    /*if (!panelsContainer.origins.has(this.#origin)) {
      console.error("Panel has invalid origin", panelId);
    }*/

    if (attributes.className) {
      this.#className = attributes.className;
    }

    //var panelNode = Reflect.construct(HTMLElement, [], this.constructor);
    this.node = this.#createPanelContainer(attributes);

    this.node.appendChild(this.#renderControls(attributes));

    // Create iframe
    this.frame = this.#createFrame(url);
    this.node.appendChild(this.frame);
    this.node.frame = this.frame;

    if (this.frame.dataset.src) {
      this.location = new URL(this.frame.dataset.src, this.#environment.url).href;
    }

    if (attributes.type) {
      this.node.dataset.type = attributes.type;
    }

    this.on("panel-loading", (panelLoading) => {
      requestAnimationFrame(() => {
        if (panelLoading.isLoading) {
          this.node.classList.add("wy-loading");
        } else {
          this.node.classList.remove("wy-loading");
        }

        if (panelLoading.isLoaded) {
          this.node.classList.add("wy-loaded");
        } else {
          this.node.classList.remove("wy-loaded");
        }
      });
    });

    // TODO: UNREGISTER
    WeavyPostal.on(
      "ready",
      { weavyId: this.#environment.getId(), windowName: this.frame.name },
      (ready) => this.#onReady(ready)
    );

    // TODO: UNREGISTER
    WeavyPostal.on(
      "unready",
      { weavyId: this.#environment.getId(), windowName: this.frame.name },
      () => this.#onUnready()
    );

    // TODO: UNREGISTER
    WeavyPostal.on(
      "load",
      { weavyId: this.#environment.getId(), windowName: this.frame.name },
      () => {
        this.whenLoaded.resolve(this);
      }
    );

    WeavyPostal.on("overlay-open", { weavyId: this.#environment.getId(), windowName: this.frame.name }, (overlayOptions) => {
      var overlayUrl = new URL(overlayOptions.url, this.#environment.url).href;
      overlayOptions.url = overlayUrl;
      overlayOptions.overlayId = overlayOptions.overlayId || overlayOptions.type || overlayOptions.weavyMessageId || "overlay";

      console.log("overlay-open", overlayOptions);

      this.triggerEvent("overlay-open", overlayOptions);
  });

  WeavyPostal.on("navigation-open", { weavyId: this.#environment.getId(), windowName: this.frame.name }, (message, event) => {
    let route = typeof message.route === "string" ? { url: message.route } : message.route;
    console.log("navigation-open", route)

    /**
     * Navigation event triggered when a page should be opened in another space or app.
     * 
     * @category events
     * @event WeavyNavigation#navigate
     * @property {WeavyNavigation~navigationRequest} route - Data about the requested navigation
     * 
     */
    route.source = message.windowName;
    route = this.triggerEvent("before:navigate", route);

    if (route !== false) {
      console.info("navigate: trying internal auto navigation");
      this.open(route.url).catch(() => {
        // Only trigger on: and after: if .open was unsuccessful
        route = this.triggerEvent("on:navigate", route);
        if (route !== false) {
          this.triggerEvent("after:navigate", route);
        }
      });
    }
  })

    /**
     * Triggered when the app receives a postMessage sent from the panel frame.
     *
     * @category events
     * @event WeavyPanels#message
     * @returns {Object}
     * @property {string} panelId - Id of the panel
     */
    // TODO: UNREGISTER
    WeavyPostal.on(
      "message",
      { weavyId: this.#environment.getId(), windowName: this.frame.name },
      (message, event) =>
        this.triggerEvent("message", assign(message, { panelId: this.panelId }), event)
    );

    // Send styles to frame on ready and when styles are updated
    this.on("panel-ready", () => {
      console.log("panel-ready -> postStyles()")
      this.postStyles()
    });

    // Reset the panel from the inside
    // TODO: UNREGISTER
    WeavyPostal.on(
      "request:reset",
      { weavyId: this.#environment.getId(), windowName: this.frame.name },
      () => {
        this.reset();
      }
    );

    // Close the panel from the inside
    // TODO: UNREGISTER
    WeavyPostal.on(
      "request:close",
      { weavyId: this.#environment.getId(), windowName: this.frame.name },
      () => {
        this.close();
      }
    );

    /**
     * Triggered when a panel is added
     *
     * @event WeavyPanels#panel-added
     * @category events
     * @returns {Object}
     * @property {Element} panel - The created panel
     * @property {string} panelId - The id of the panel
     * @property {url} url - The url for the frame.
     * @property {Object} attributes - Panel attributes
     * @property {string} attributes.type - Type of the panel.
     * @property {boolean} attributes.persistent - Will the panel remain when {@link WeavyPanels~panel#remove} or {@link WeavyPanels#clearPanels} are called?
     */
    this.triggerEvent("panel-added", {
      panel: this,
      panelId: this.panelId,
      url: url,
      attributes: attributes,
    });

    this.whenDOMConnected.resolve();
    // CONFIGURE END
  }

  #createPanelContainer(attributes) {
    const panelElementId = this.#environment.getId("panel-container-" + this.panelId);
    const node = document.createElement("div");

    node.className = "wy-panel";

    if (attributes.className) {
      node.classList.add(...attributes.className.split(" "));
    }
    node.id = panelElementId;
    node.dataset.id = this.panelId;

    if (attributes.title) {
      node.dataset.title = attributes.title;
    }

    return node;
  }

  #createFrame(url) {
    // frame
    var frame = document.createElement("iframe");
    frame.className = "wy-panel-frame";
    frame.id = this.#environment.getId("panel-" + this.panelId);
    frame.name = this.#environment.getId("panel-" + this.panelId);
    frame.allowFullscreen = 1;
    frame.loading = "lazy";
    frame.dataset.weavyId = this.#environment.getId();

    if (url) {
      // Stores the provided url as data src for load when requested later.
      // If the frame src is unset it means that the frame is unloaded
      // If both data src and src are set it means it's loading
      frame.dataset.src = new URL(url, this.#environment.url).href;
    }

    return frame;
  }

  /**
   * Registers the panel frame window in postal and adds a ready listener for the panel and inits the loading indication.
   */
  #registerLoading() {
    if (!this.#isRegistered) {
      try {
        console.log(
          "registering panel", 
          this.frame.contentWindow.self,
          this.frame.name,
          this.#environment.getId(),
          this.#origin
        );
        WeavyPostal.registerContentWindow(
          this.frame.contentWindow.self,
          this.frame.name,
          this.#environment.getId(),
          this.#origin
        );
      } catch (e) {
        console.error("Could not register window id", this.frame.name, e);
      }

      this.#isRegistered = true;
    }
  }

  /**
   * Set the loading indicator on the specified panel. The loading indicator is automatically removed on loading. It also makes sure the panel is registered and sets up frame communication when loaded.
   *
   * @function
   * @emits WeavyPanels#panel-loading
   */
  #updatePanelLoading() {
    if (this.isLoading) {
      this.#registerLoading();
      this.#loadingTimeout = whenTimeout(30000);
      this.#loadingTimeout.then(() => {
        this.#isLoading = false;
        this.#updatePanelLoading();
      });
    } else {
      if (this.#loadingTimeout) {
        this.#loadingTimeout.cancel();
        this.#loadingTimeout = null;
      }
    }

    /**
     * Event triggered when panel is starting to load or stops loading.
     *
     * @category events
     * @event WeavyPanels#panel-loading
     * @returns {Object}
     * @property {string} panelId - The id of the panel loading.
     * @property {boolean} isLoading - Indicating whether the panel is loading or not.
     * @property {boolean} fillBackground - True if the panel has an opaque background during loading.
     */
    this.triggerEvent("panel-loading", {
      panelId: this.panelId,
      isLoading: this.isLoading,
      isLoaded: this.isLoaded,
    });
  }

  loadingStarted(replaced) {
    if (replaced) {
      this.#isLoaded = false;
    }
    this.#isLoading = true;
    this.#updatePanelLoading();
  }

  loadingFinished() {
    this.#isLoaded = true;
    this.#isLoading = false;
    this.#updatePanelLoading();
  }

  #onReady(readyEvent) {
    this.#isReady = true;
    this.triggerEvent("before:panel-ready", { panelId: this.panelId });

    var previousLocation = this.location;
    var previousStatusCode = this.statusCode;
    var statusOk = !readyEvent.statusCode || readyEvent.statusCode === 200;

    this.location = new URL(readyEvent.location, this.#environment.url).href;
    this.statusCode = readyEvent.statusCode;

    if (typeof readyEvent.title === "string" && readyEvent.title) {
      this.node.dataset.title = readyEvent.title;
    }

    this.loadingFinished();

    if (previousStatusCode !== readyEvent.statusCode && !statusOk) {
      console.warn(
        readyEvent.location + " " + readyEvent.statusCode + " " + readyEvent.statusDescription
      );
    }

    var changedLocation =
      previousLocation && previousLocation !== this.location;
    var changedStatusCode = previousStatusCode !== this.statusCode;
    var originalLocation =
      this.location === this.frame.dataset.src && !this.isOpen;

    if (this.isOpen && (changedLocation || changedStatusCode)) {
      if (changedLocation && statusOk && !originalLocation) {
        this.stateChangedAt = Date.now();
      } else if (!statusOk || originalLocation) {
        this.stateChangedAt = null;
      }
      //TODO: ADD HISTORY
      this.triggerEvent("panel-history-add", { action: "replace", state: this.getState() });
    }

    /**
     * Event triggered when panel has loaded and is connected via WeavyPostal.
     *
     * @category events
     * @event WeavyPanels#panel-ready
     * @returns {Object}
     * @property {string} panelId - The id of the panel loading.
     */
    this.triggerEvent("on:panel-ready", { panelId: this.panelId });

    this.whenReady.resolve(this);
    this.triggerEvent("after:panel-ready", { panelId: this.panelId });
  }

  #onUnready() {
    this.triggerEvent("before:panel-unready", { panelId: this.panelId });

    this.#isReady = false;
    this.loadingStarted(true);
    this.whenReady.reset();

    /**
     * Event triggered when panel has unloaded, by navigation or reload for example.
     *
     * @category events
     * @event WeavyPanels#panel-unready
     * @returns {Object}
     * @property {string} panelId - The id of the panel unloading.
     */
    this.triggerEvent("on:panel-unready", { panelId: this.panelId });

    this.triggerEvent("after:panel-unready", { panelId: this.panelId });
  }

  // OTHER FUNCTIONS

  /**
   * Loads an url in a frame or sends data into a specific frame. Will replace anything in the frame.
   *
   * @ignore
   * @param {HTMLIFrameElement} frame - The frame element
   * @param {any} url - URL to load.
   * @param {any} [data] - URL/form encoded data.
   * @param {any} [method=GET] - HTTP Request Method {@link https://developer.mozilla.org/en-US/docs/Web/HTTP/Methods}
   * @returns {Promise}
   */
  async #sendToFrame(frame, url, data, method) {
    await this.#environment.whenReady();
    await this.whenDOMConnected();

    method = String(method || "get").toLowerCase();

    if (frame) {
      var frameUrl = url;
      if (method === "get") {
        if (data) {
          // Append data to URL
          if (frameUrl.indexOf("?") === -1) {
            frameUrl = frameUrl + "?" + data;
          } else {
            frameUrl = frameUrl + "&" + data;
          }
        }
      }

      if (frame.src !== frameUrl) {
        // If no url is set yet, set an url
        frame.src = frameUrl;
        if (method === "get") {
          console.debug("sendToFrame using src");
          // No need to send a form since data is appended to the url
          return;
        }
      } else if (frame.src && method === "get") {
        console.debug("sendToFrame using window.open");
        window.open(frameUrl, frame.name);
        return;
      }

      console.debug("sendToFrame using form");

      // Create a form to send to the frame
      var requestForm = document.createElement("form");
      requestForm.action = url;
      requestForm.method = method;
      requestForm.target = frame.name;

      if (data) {
        data = data.replace(/\+/g, "%20");
      }
      var dataArray = (data && data.split("&")) || [];

      // Add all data as hidden fields
      dataArray.forEach((pair) => {
        var nameValue = pair.split("=");
        var name = decodeURIComponent(nameValue[0]);
        var value = decodeURIComponent(nameValue[1]);

        var formInput = document.createElement("input");
        formInput.type = "hidden";
        formInput.name = name;
        formInput.value = value;

        requestForm.appendChild(formInput);
      });

      // Send the form and forget it
      if (!frame.parentElement) {
        throw new Error("Could not send to frame. The frame is not connected to the DOM.");
      }
      
      frame.parentElement.appendChild(requestForm);
      requestForm.submit();
      requestForm.remove();
    }
  }

  /**
   * Create panel controls for expand/collapse and close. Set control settings in {@link panels.defaults|options}
   *
   * @returns {Element}
   */
  #renderControls(options) {
    var controls = document.createElement("div");
    controls.className = "wy-controls";

    if (options.controls) {
      if (options.controls === true || options.controls.close) {
        var close = document.createElement("button");
        close.className =
          "wy-button wy-button-icon" +
          (typeof options.controls.close === "string"
            ? " " + options.controls.close
            : "");
        close.title = "Close";
        close.innerHTML =
          '<svg height="24" viewBox="0 0 24 24" width="24" data-icon="close" class="wy-icon"><path d="m19 6.41-1.41-1.41-5.59 5.59-5.59-5.59-1.41 1.41 5.59 5.59-5.59 5.59 1.41 1.41 5.59-5.59 5.59 5.59 1.41-1.41-5.59-5.59z"></path></svg>';
        close.onclick = () => this.close();
        controls.appendChild(close);
      }
    }

    return controls;
  }

  // METHODS

  /**
   * Tries to focus the panel
   *
   */
  focus(outside) {
    if (outside) {
      this.node.focus();
    } else {
      try {
        this.frame.contentWindow.focus();
      } catch (e) {
        this.frame.focus();
      }
    }
  }

  /**
   * Open a the panel. The open waits for the [weavy.whenReady]{@link Weavy#whenReady} to complete, then opens the panel.
   *
   * Returns a promise that is resolved when the panel is opened and fully loaded.
   *
   * @function
   * @name WeavyPanels~panel#open
   * @param {string} [destination] - Tells the panel to navigate to a specified url.
   * @emits WeavyPanels#panel-open
   * @returns {Promise}
   */
  async open(destination, noHistory) {
    await this.#environment.whenReady();
    await this.whenDOMConnected();

    console.log(
      "openPanel",
      this.panelId + (destination ? " " + destination : ""),
      noHistory ? "no history" : "with history"
    );

    if (!this.#environment.authentication.isAuthorized) {
      throw new Error("Unauthorized, can't open panel " + this.panelId);
    }

    /**
     * Event triggered when a panel is opened.
     *
     * @category events
     * @event WeavyPanels#panel-open
     * @returns {Object}
     * @property {string} panelId - The id of the panel being opened.
     * @property {string} [destination] - Any url being requested to open in the panel.
     * @property {WeavyPanels~container} panels - The panels container for the panel
     */
    var openResult = this.triggerEvent("panel-open", {
      panelId: this.panelId,
      destination: destination,
      panels: this.#panelsContainer,
    });

    if (openResult !== false && openResult.panelId === this.panelId) {
      window.requestAnimationFrame(() =>
        this.node.classList.add("wy-transition")
      );
      this.node.classList.add("wy-open");
      if (!noHistory) {
        this.focus(true);
        this.whenLoaded().then(() => this.focus());
      }
      return await this.load(
        openResult.destination,
        null,
        null,
        null,
        noHistory
      );
    } else {
      throw new Error("Prevented open " + this.panelId);
    }
  }

  /**
   * Closes the panel.
   *
   * Returns a promise that is resolved when the panel is closed.
   *
   * @function
   * @name WeavyPanels~panel#close
   * @returns {Promise}
   * @emits WeavyPanels#panel-close
   */
  async close(noHistory, noEvent) {
    await this.#environment.whenReady();
    await this.whenDOMConnected();

    if (this.isOpen) {
      console.info(
        "closePanel",
        this.panelId,
        noEvent === true ? "no event" : "",
        noHistory === true ? "no history" : ""
      );

      this.whenClosed.reset();

      var closePromises = [];

      this.triggerEvent("before:panel-close", {
        panelId: this.panelId,
        panels: this.#panelsContainer,
      });
      this.node.classList.remove("wy-open", "wy-transition");

      if (noEvent !== true) {
        /**
         * Event triggered when weavy closes a panel.
         *
         * @category events
         * @event WeavyPanels#panel-close
         * @returns {Object}
         * @property {string} panelId - The id of the panel
         * @property {WeavyPanels~container} panels - The panels container for the panel
         */
        this.triggerEvent("on:panel-close", {
          panelId: this.panelId,
          panels: this.#panelsContainer,
        });

        if (noHistory !== true) {
          this.stateChangedAt = Date.now();
          // TODO: Add history
          this.triggerEvent("panel-history-add", { action: "push", state: this.getState() });
        }
      }

      closePromises.push(this.postMessage({ name: "close" }));

      // Return timeout promise
      closePromises.push(whenTimeout(250));

      await Promise.all(closePromises);
      await this.postMessage({ name: "closed" });
      this.triggerEvent("after:panel-close", {
        panelId: this.panelId,
        panels: this.#panelsContainer,
      });
      this.whenClosed.resolve();
    }
  }

  /**
   * Load an url with data directly in the panel. Uses turbolinks forms if the panel is loaded and a form post to the frame if the panel isn't loaded.
   *
   * Loads the predefined panel url if url parameter is omitted.
   *
   * Returns a promise that is resolved when the panel is loaded.
   *
   * @function
   * @name WeavyPanels~panel#load
   * @param {string} [url] - The url to load in the panel.
   * @param {any} [data] -  URL/form-encoded data to send
   * @param {string} [method=GET] - HTTP Request Method {@link https://developer.mozilla.org/en-US/docs/Web/HTTP/Methods}
   * @param {bool} [replace] - Replace the content in the panel and load it fresh.
   * @returns {Promise}
   */
  async load(url, data, method, replace, noHistory) {
    await this.#environment.whenReady();
    await this.whenDOMConnected();

    var frameTarget = this.frame;
    console.log("panel.load", url, replace);

    if (url) {
      url = new URL(url, this.#environment.url).href;

      console.log("checking origin", this.#environment.origins,
        new URL(url, this.#environment.url).origin)

      // TODO: fix origin
      if (
        !this.#environment.origins.has(
          new URL(url, this.#environment.url).origin
        )
      ) {
        return Promise.reject("panel url has invalid origin", new URL(url, this.#environment.url).origin);
      }

      this.location = url;

      // Not yet fully loaded
      if (this.isReady) {
        console.log("panel is ready, load");
        if (replace) {
          this.loadingStarted(true);
        }
        // Fully loaded, send using turbolinks
        await this.postMessage({
          name: "turbo-visit",
          url: url,
          data: data,
          method: method,
          action: "replace",
        });
      } else {
        console.log("panel not ready load");
        this.loadingStarted(replace);
        await this.#sendToFrame(frameTarget, url, data, method);
      }
    } else if (!this.isLoaded && !this.isLoading) {
      // start predefined loading
      console.debug("panels:", this.panelId, "predefined loading");
      this.loadingStarted(true);
      frameTarget.setAttribute("src", frameTarget.dataset.src);
    } else if (this.isLoaded || this.isLoading) {
      // already loaded
      await this.postMessage({ name: "show" });
    }

    // ADD HISTORY
    if (noHistory !== true) {
      this.stateChangedAt = Date.now();
      console.debug(
        "panels: adding history state",
        this.panelId,
        this.location
      );
      
      // TODO: Add history
      this.triggerEvent("panel-history-add", { action: "push", state: this.getState() });
    }
  }

  /**
   * Tells the panel that it needs to reload it's content.
   *
   * Returns a promise that is resolved when the panel is loaded.
   *
   * @function
   * @name WeavyPanels~panel#reload
   * @emits Weavy#panel-reload
   * @returns {Promise}
   **/
  async reload() {
    await this.#environment.whenReady();
    await this.whenDOMConnected();

    this.isLoading = true;

    await this.postMessage({ name: "reload" });

    /**
     * Event triggered when a panel is reloading it's content.
     *
     * @category events
     * @event WeavyPanels#panel-reload
     * @returns {Object}
     * @property {string} panelId - The id of the panel being reloaded.
     */
    this.triggerEvent("panel-reload", { panelId: this.panelId });
  }

  /**
   * Creates a new panel iframe and resets the panel to its original url. This can be used if the panel has ended up in an incorrect state.
   *
   * @function
   * @name WeavyPanels~panel#reset
   * @returns {Promise}
   **/
  async reset() {
    await this.#environment.whenReady();
    await this.whenDOMConnected();

    var oldFrame = this.frame;

    if (oldFrame) {
      console.log("resetting panel", this.panelId);

      var newFrame = this.#createFrame(oldFrame.dataset.src || oldFrame.src);

      this.#isRegistered = false;
      this.#isReady = false;
      this.#isLoaded = false;
      this.#isLoading = false;

      this.location = null;
      this.statusCode = null;

      this.whenReady.reset();
      this.whenLoaded.reset();

      var isOpen = this.isOpen;

      try {
        WeavyPostal.unregisterContentWindow(oldFrame.name, this.#environment.getId());
      } catch (e) {
        console.error("Could not unregister window id", oldFrame.name, e);
      }

      this.node.removeChild(oldFrame);
      this.node.appendChild(newFrame);

      this.frame = newFrame;

      /**
       * Triggered when a panel has been reset.
       *
       * @event WeavyPanels#panel-reset
       * @category events
       * @returns {Object}
       * @property {string} panelId - Id of the reset panel
       */
      this.triggerEvent("panel-reset", { panelId: this.panelId });

      if (isOpen) {
        await this.load(null, null, null, null, true);
      }
    }
  }

  /**
   * Gets the current history state of the panel
   *
   * @function
   * @name WeavyPanels~panel#getState
   * @returns {WeavyHistory~panelState}
   **/
  getState() {
    console.debug("getPanelState", this.panelId);
    var weavyId = this.#environment.getId();
    var weavyUriId = this.#environment.getId(this.panelId).replace("__", "@");

    var relUrl = this.location && new URL(this.location, this.#environment.url).pathname;
    var weavyUri = "wy://" + weavyUriId + (relUrl || "")

    return {
      id: this.node.id,
      panelId: this.panelId,
      isOpen: this.isOpen,
      location: this.location,
      statusCode: this.statusCode,
      title: this.node.dataset.title,
      weavyId: weavyId,
      weavyUri: weavyUri,
      changedAt: this.stateChangedAt,
      attributes: this.attributes
    };
  
  }

  /**
   * Sets the state of the panel.
   *
   * @function
   * @name WeavyPanels~panel#setState
   * @param {WeavyHistory~panelState} state - The history panel state to apply
   * @returns {Promise}
   **/
  async setState(state) {
    if (!state || state.panelId !== this.panelId) {
      console.warn("setState: State not valid.", this.panelId);
      return;
    }

    // TODO: fix origin
    /*if (
      !this.#panelsContainer.origins.has(
        new URL(state.location, this.#environment.url).origin
      )
    ) {
      console.warn(
        "setState: Invalid url origin.",
        this.panelId,
        new URL(state.location, this.#environment.url).origin
      );
      return;
    }*/

    if (state.title) {
      this.node.dataset.title = state.title;
    }

    var statusOk = !state.statusCode || state.statusCode === 200;

    if (!statusOk) {
      console.warn("setState: Invalid url http status.", this.panelId);
      return;
    }

    if (state.isOpen !== this.isOpen || state.location !== this.location) {
      this.stateChangedAt = state.changedAt;
    }

    if (state.isOpen) {
      var panelLocation =
        state.location !== this.location ? state.location : null;
      if (this.isOpen) {
        await this.open(panelLocation, true);
      } else {
        await this.open(state.location, true);
      }
    } else {
      await this.close(true);
    }
  }

  /**
   * Sends a postMessage to the panel iframe.
   * Returns a promise that is resolved when the message has been delivered and rejected if the message fails or has timed out.
   *
   * @function
   * @name WeavyPanels~panel#postMessage
   * @param {object} message - The Message to send
   * @param {Transferable[]} [transfer] - A sequence of Transferable objects that are transferred with the message.
   * @see {@link https://developer.mozilla.org/en-US/docs/Web/API/Window/postMessage}
   * @returns {Promise}
   */
  async postMessage(message, transfer) {
    await this.whenReady();
    var frameTarget = this.frame;

    if (!frameTarget) {
      throw new Error("No valid panel frame for " + this.panelId + ".");
    }

    if (!frameTarget.isConnected) {
      throw new Error(
        "Panel frame " + this.panelId + " is not connected to the DOM."
      );
    }

    if (frameTarget && WeavyPostal) {
      await WeavyPostal.postToFrame(
        frameTarget.name,
        this.#environment.getId(),
        message,
        transfer
      );
    } else {
      throw new Error("Could not post message to frame");
    }
  }

  /**
   * Removes a panel. If the panel is open it will be closed before it's removed.
   *
   * @function
   * @name WeavyPanels~panel#remove
   * @param {boolean} [force] - True will remove the panel even if it's persistent
   * @emits WeavyPanels#panel-removed
   * @returns {Promise}
   */

  async remove(force, noHistory) {
    if (!force) {
      await this.#environment.whenReady();
    }

    if (this.isOpen) {
      this.node.id = this.#environment.getId("weavy-panel-removed-" + this.panelId);
      await whenTimeout(0);
      await this.close(noHistory);
      await this.remove(force, noHistory);
    } else {
      try {
        WeavyPostal.unregisterContentWindow(
          this.frame.name,
          this.#environment.getId()
        );
      } catch (e) {
        console.error("Could not unregister window id", this.frame.name, e);
      }

      this.node.remove();
      this.#panels.delete(this.panelId);

      /**
       * Triggered when a panel has been removed.
       *
       * @event WeavyPanels#panel-removed
       * @category events
       * @returns {Object}
       * @property {string} panelId - Id of the removed panel
       */
      this.#panelsContainer.triggerEvent("panel-removed", {
        panelId: this.panelId,
      });
    }
  }

  // CSS

  /**
   * Updates the styles on the panel.
   *
   * @function
   * @name WeavyPanels~panel#postStyles
   */
  async postStyles() {
    let eventCss = this.triggerEvent("before:panel-css", {
      panelId: this.panelId,
      css: "",
    });
    if (!eventCss) return;

    eventCss = this.triggerEvent("on:panel-css", {
      panelId: this.panelId,
      css: eventCss.css,
    });
    if (!eventCss) return;

    // TODO: UNIQUE classnames only?
    let className = [this.className].filter((x) => x).join(" ");

    await this.postMessage({
      name: "styles",
      id: this.panelId,
      css: eventCss.css,
      className: className,
    });

    this.triggerEvent("after:panel-css", eventCss);
  }
}

window.customElements.define('weavy-panel', WeavyPanel);