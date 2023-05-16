import {
  sanitizeJSON,
  processJSONResponse,
  defaultFetchSettings,
} from "../utils/data";
import { ready } from "../utils/dom";
import { assign } from "../utils/objects";
import WeavyAuthenticationsManager from "./authentication";
import WeavyUrlClassManager from "../utils/url-class-manager";
import WeavyConsole from "../utils/console";
import WeavyEvents from "../utils/events";
import WeavyPromise from "../utils/promise";
import { generateId } from "../utils/id";
import doFrameStatusCheck from "./status";
import { getBrowserState, setBrowserState } from '../utils/browser-history';

const console = new WeavyConsole("WeavyEnvironment");

const initUrl = "/dropin/client/init";

class WeavyEnvironment extends WeavyEvents {
  #url;
  #authentication;

  #id;

  options = {};
  data = {};

  origins = new Set();

  get url() {
    return this.#url;
  }

  // ID functions

  /**
   * Appends the weavy-id to an id. This makes the id unique per weavy instance. You may define a specific weavy-id for the instance in the {@link Weavy#options}. If no id is provided it only returns the weavy id. The weavy id will not be appended more than once.
   *
   * @param {string} [id] - Any id that should be completed with the weavy id.
   * @returns {string} Id completed with weavy-id. If no id was provided it returns the weavy-id only.
   */
  getId(id) {
    return id ? this.removeId(id) + "__" + this.#id : this.#id;
  }

  /**
   * Removes the weavy id from an id created with {@link Weavy#getId}
   *
   * @param {string} id - The id from which the weavy id will be removed.
   * @returns {string} Id without weavy id.
   */
  removeId(id) {
    return id
      ? String(id).replace(new RegExp("__" + this.getId() + "$"), "")
      : id;
  }

  /**
   * Reference to the instance of the WeavyAuthentication for the current server.
   *
   * You always need to define an async token factory in your options.
   * This is an async function that returns a token string.
   * Whenever a new access token is needed, the async function will be called again with the previous token provided as argument.
   *
   * See [Client Authentication]{@link https://docs.weavy.com/client/authentication} for full authentication documentation.
   *
   * @type {WeavyAuthentication}
   * @category authentication
   * @borrows WeavyAuthentication#setTokenFactory as Weavy#authentication#setTokenFactory
   * @borrows WeavyAuthentication#signIn as Weavy#authentication#signIn
   * @borrows WeavyAuthentication#signOut as Weavy#authentication#signOut
   */
  get authentication() {
    return this.#authentication;
  }

  isLoading = false;
  isLoaded = false;

  #whenLoaded = new WeavyPromise();
  #whenStatusChecked = new WeavyPromise()

  async whenReady() {
    await this.authentication.whenAuthorized()
    await this.#whenStatusChecked();
    await this.#whenLoaded();
  }

  constructor(url) {
    super()
    this.#url = new URL(url);

    this.origins.add(this.#url.origin);

    // Set id
    this.#id = generateId();

    // AUTHENTICATION & ACCESS TOKEN
    this.#authentication = WeavyAuthenticationsManager.get(url);

    this.authentication.whenAuthenticated().then(() => {
      ready(() => {
        doFrameStatusCheck(this).then(() => {
          this.#whenStatusChecked.resolve();
        });
      })
    });

    // HISTORY
    window.addEventListener("popstate", () => this.restoreHistory());

    setTimeout(() => this.restoreHistory(), 0)
  }

  restoreHistory() {
    var browserState = getBrowserState(this.#url.origin);
    if (browserState) {
      console.debug("history restore", browserState);
      this.triggerEvent("history-restore", browserState);
    }
  }

  /**
   * Adds a state to the browser history, by either push or replace. 
   * This is usually used automatically by internal components.
   * 
   * @emits {WeavyHistory#history}
   * @param {string} [action] - "push" or "replace". Indicates if the state should generate a new history point or replace the existing.
   * @param {WeavyHistory~weavyState} [state] - The state to add. Defaults to the current state of the weavy instance.
   * @returns {WeavyHistory~weavyState}
   */
  setHistory(action, state) {
    //state = state|| this.getCurrentState()

    // Always modify any existing state
    var currentHistoryStates = getBrowserState(this.#url.origin);

    var history = {
      state: state,
      action: action || "push", // push, replace
      url: window.location.href,
      currentStates: currentHistoryStates
    };

    /**
     * Triggered when a weavy state is added or updated. 
     * The global weavy state will be stored in `window.history.state.weavy` unless default is prevented.
     * 
     * This is where you can modify the url or the state just before it will be pushed or replaced.
     * If you call event.preventDefault() you need do save the state to the browser history by yourself.
     * 
     * @example
     * // Modify the history URL to include the last opened panel as a hash and return the data
     * weavy.on("history", (history) => {
     *     // Get only panels that has been interactively opened/closed (changedAt) and is currently open.
     *     var allOpenPanels = history.currentState.filter((panelState) => {
     *         return panelState.changedAt && panelState.isOpen;
     *     });
     *     var lastOpenPanel = allOpenPanels.pop();
     * 
     *     // Set the url
     *     if(lastOpenPanel) {
     *         // Set the hash to the last opened panel
     *         history.url = "#" + lastOpenPanel.weavyUri;
     *     } else {
     *         // Remove the hash if no changed panel is open
     *         history.url = history.url.split("#")[0];
     *     }
     * 
     *     // Return the modified data to apply it
     *     return history;
     * });
     * 
     * @category events
     * @event WeavyHistory#history
     * @returns {Object}
     * @property {WeavyHistory~weavyState} state - The state of the weavy instance
     * @property {string} action - Indicates what the intention of the history state is "push" or "replace" 
     * @property {string} url - The url to set in the browser history.
     * @property {WeavyHistory~weavyState} globalState - The current combined global state for all weavy instances.
     */

    history = this.triggerEvent("before:history", history);

    if (history !== false) {

      if (!state.id) {
        console.error("Browser state has no id");
      } else {
        history.currentStates[state.id] = state;
      }

      history = this.triggerEvent("on:history", history);

      if (history !== false) {
        console.debug("history: " + history.action + " history state");
        setBrowserState(this.#url.origin, history.currentStates, history.action, history.url)
        this.triggerEvent("after:history", history);
      }
    }

    return history.state;
  }

  async configure(options) {

    this.options = assign(this.options, options, true);

    if (options.defaults?.filebrowser) {
      this.origins.add(new URL(options.defaults.filebrowser).origin);
    }

    if (options.tokenFactory) {
      // Configure authentication
      (async () => {
        if (
          !this.#authentication.isProvided ||
          !this.#authentication.isInitialized
        ) {
          if (
            this.options.tokenFactory === undefined &&
            !this.#authentication.isProvided
          ) {
            throw new Error("specify an async token factory in your options");
          }

          this.#authentication.init(this.options.tokenFactory);
          this.#authentication.on("user", (auth) => {
            if (/^signed-in|signed-out|changed-user|user-error$/.test(auth.state)) {
              if (!this.isLoading) {
                this.isLoaded = false;
              }
    
              if (auth.state === "changed-user") {
                // TODO: document these events
                this.triggerEvent("signed-out", { id: -1 });
                this.triggerEvent("signed-in", auth);
              } else {
                this.triggerEvent(auth.state, auth);
              }
            }
          });
        }
      })();
    }

    if (!this.isLoading) {
      this.isLoaded = false;
      this.isLoading = true;

      this.#whenLoaded.reset();

      // Configure settings
      (async () => {
        const fetchInitUrl = new URL(initUrl, this.url);

        let initData = {};

        if (this.options.lang) {
          initData.lang = this.options.lang;
        }
  
        if (this.options.tz) {
          initData.tz = this.options.tz;
        }

        var clientData = await this.fetch(
          fetchInitUrl,
          initData,
          "POST",
          null,
          true
        );

        this.isLoading = false;

        if (!clientData) {
          throw new Error("Error loading client data");
        }

        this.data = clientData;
        
        this.isLoaded = true;
        this.#whenLoaded.resolve();
      })()

    }
    await Promise.all([
      this.authentication.whenAuthenticated(),
      this.#whenLoaded()
    ])
  }

  /**
   * Method for calling JSON API endpoints on the server. You may send data along with the request or retrieve data from the server.
   *
   * Fetch API is used internally and you may override or extend any settings in the {@link external:fetch} by providing custom [fetch init settings]{@link external:fetchSettings}.
   *
   * You may of course call the endpoints using any other preferred fetch or AJAX method, but this method is preconfigured with proper encoding and crossdomain settings.
   *
   * @param {string|URL} url - URL to the JSON endpoint. May be relative to the connected server.
   * @param {object} [data] - Data to send. May be an object that will be encoded or a string with pre encoded data.
   * @param {string} [method=GET] - HTTP Request Method {@link https://developer.mozilla.org/en-US/docs/Web/HTTP/Methods}
   * @param {external:fetchSettings} [settings] - Settings to extend or override [fetch init settings]{@link external:fetchSettings}.
   * @returns {Promise}
   */
  async fetch(url, data, method, settings) {

    url = new URL(url, this.url);
    method = method || "GET";
    data =
      (data && typeof data === "string" && data) ||
      (method !== "GET" && data && JSON.stringify(data, sanitizeJSON)) ||
      data ||
      "";

    var isUnique = !!(method !== "GET" || data);
    var isSameOrigin = url.origin === this.url.origin;

    if (!isSameOrigin) {
      throw new Error(
        "fetch: Only requests to the weavy environment are allowed."
      );
    }

    let fetchSettings = assign(
      defaultFetchSettings,
      {
        method: method,
        cache: isUnique ? "no-cache" : "default", // *default, no-cache, reload, force-cache, only-if-cached
      },
      true
    );

    settings = assign(fetchSettings, settings, true);

    if (data && method !== "GET") {
      settings.body = data; // body data type must match "Content-Type" header
    } else if (data) {
      let urlData = new URLSearchParams(data);
      url.search = (url.search ? url.search + "&" : "") + urlData.toString();
    }

    await this.#authentication.whenAuthenticated();
    let token = await this.#authentication.getAccessToken();

    if (typeof token !== "string") {
      throw new Error("fetch: Provided access token is empty!");
    }

    // access token configured, use bearer token
    settings.headers.Authorization = "Bearer " + token;

    let response = await window.fetch(url.toString(), settings);

    if (response.status === 401 || response.status === 403) {
      console.warn("fetch: access token failed, trying again");

      let token = await this.#authentication.getAccessToken(true);
      settings.headers.Authorization = "Bearer " + token;

      response = await window.fetch(url.toString(), settings);
    }

    return processJSONResponse(response);
  }
}

export default new WeavyUrlClassManager(WeavyEnvironment);
