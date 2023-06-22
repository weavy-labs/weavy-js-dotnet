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

/**
 * Environment options
 * 
 * @typedef {object} WeavyEnvironmentOptions
 * @property {(refresh: boolean) => Promise<string>} tokenFactory
 */

/**
 * Environment data
 * 
 * @typedef {object} WeavyEnvironmentData
 * @property {"Unknown"|"Ok"|"DatabaseInvalid"|"LicenseError"|"LicenseInvalid"|"LicenseMissing"|"Error"} status - Status of the server. Usually "Ok".
 * @property {string} version - Semver version of the weavy environment.
 */

/**
 * Manager for handling authentication, data fetching and history for a weavy environment.
 * 
 * @class
 * @extends {WeavyEvents}
 */
class WeavyEnvironment extends WeavyEvents {
  /**
   * @private
   * @type {URL}
   */
  #url;

  /**
   * @private
   * @type {WeavyAuthentications~ClassType}
   */
  #authentication;

  /**
   * @private
   * @type {string}
   */
  #id;

  /**
   * @type {WeavyEnvironmentOptions}
   */
  options = {};

  /**
   * @type {WeavyEnvironmentData}
   */
  data = {};

  /**
   * Origins allowed to be used with the environment.
   * 
   * @type {Set<string>}
   */
  origins = new Set();

  /**
   * The url of the environment.
   * @readonly
   * @type {URL}
   */
  get url() {
    return this.#url;
  }

  /**
   * The weavy console logging.
   */
  get console() {
    return console;
  }

  // ID functions

  /**
   * Appends the environment-id to an id. This makes the id unique per environment. You may define a specific environment-id for the instance in the {@link WeavyEnvironment#options}. If no id is provided it only returns the environment id. The environment id will not be appended more than once.
   *
   * @param {string} [id] - Any id that should be completed with the environment id.
   * @returns {string} Id completed with environment-id. If no id was provided it returns the environment-id only.
   */
  getId(id) {
    return id ? this.removeId(id) + "__" + this.#id : this.#id;
  }

  /**
   * Removes the environment id from an id created with {@link WeavyEnvironment#getId}
   *
   * @param {string} id - The id from which the environment id will be removed.
   * @returns {string} Id without environment id.
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
   * See [Client Authentication](https://www.weavy.com/docs/reference/uikit-js/authentication) for full authentication documentation.
   *
   * @type {WeavyAuthentications~ClassType}
   */
  get authentication() {
    return this.#authentication;
  }

  /**
   * Indicates if an update of the environment data is requested.
   * 
   * @private
   * @type {boolean}
   */
  #isLoadingRequested = false;

  /**
   * Indicates if the environment data is loading.
   * 
   * @private
   * @type {boolean}
   */
  #isLoading = false;


  /**
   * Promise resolved when the environment data is loaded.
   * 
   * @private
   * @type {WeavyPromise}
   */
  #whenLoaded = new WeavyPromise();

  /**
   * Promise resolved when the CORS, cookie and iFrame status has been checked-
   * 
   * @private
   * @type {WeavyPromise}
   */
  #whenStatusChecked = new WeavyPromise()

  /**
   * Async function resolved when the environment authentication is established, the environment data is loaded and the environment connection status is ok.
   * 
   * @async
   * @function
   */
  async whenReady() {
    await this.authentication.whenAuthorized()
    await this.#whenStatusChecked();
    await this.#whenLoaded();
  }

  /**
   * Creates a new instance for a specific environment URL. Instantiation is normally handled by {@link WeavyUrlClassManager}.
   * 
   * @param {string} url - The URL to the environment
   */
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

  /**
   * Restores the history state from the browser history.
   * 
   * @emits WeavyEnvironment#history-restore
   * @returns {Object} The browser state that was previously set
   */
  restoreHistory() {
    var browserState = getBrowserState(this.#url.origin);
    if (browserState) {
      console.debug("history restore", browserState);
      /**
       * Triggered when the environment history is restored from the browser history.
       * 
       * @event WeavyEnvironment#history-restore
       * @type {object} - The browser state that was previously set
       */
      this.triggerEvent("history-restore", browserState);
    }

    return browserState;
  }

  /**
   * Adds a state to the browser history, by either push or replace. 
   * This is usually used automatically by internal components.
   * 
   * @emits WeavyEnvironment#history
   * @template S
   * @param {string} [action] - "push" or "replace". Indicates if the state should generate a new history point or replace the existing.
   * @param {S} [state] - The state to add.
   * @returns {S} The state with any modifications done in the "history" event.
   */
  setHistory(action, state) {

    // Always modify any existing state
    var currentHistoryStates = getBrowserState(this.#url.origin);

    /**
     * @typedef {object} WeavyEnvironmentHistory
     * @property {S} state - The state of the weavy instance
     * @property {string} action - Indicates what the intention of the history state is "push" or "replace" 
     * @property {string} url - The url to set in the browser history.
     * @property {{ url: S }} currentStates - The current combined global state for all weavy instances.
     */
    var history = {
      state: state,
      action: action || "push", // push, replace
      url: window.location.href,
      currentStates: currentHistoryStates
    };

    /**
     * Triggered when a environment state is added or updated. 
     * The state will be stored in `window.history.state.weavy` unless default is prevented.
     * 
     * This is where you can modify the url or the state just before it will be pushed or replaced.
     * If you call event.preventDefault() you need do save the state to the browser history by yourself.
     * 
     * @example
     * // Modify the history URL to include the last opened panel as a hash and return the data
     * environment.on("history", (history) => {
     *   history.url += "#mycustomhash";
     * 
     *   // Return the modified data to apply it
     *   return history;
     * });
     * 
     * @event WeavyEnvironment#history
     * @type {WeavyEnvironmentHistory}
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

  /**
   * Set or update environment configuration. Triggers any initialization needed. 
   * 
   * Resolved when authentication is established and environment data is loaded.
   * 
   * @async
   * @function
   * @param {WeavyEnvironmentOptions} options 
   */
  async configure(options) {

    this.options = assign(this.options, options, true);

    if (options.defaults?.filebrowser) {
      // TODO: Move this to WeavyApp
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

    if (!this.#isLoadingRequested) {
      this.#isLoadingRequested = true;
      this.#isLoading = true;
        
      this.#whenLoaded.reset();

      // Configure settings
      queueMicrotask(async () => {
        if (this.#isLoadingRequested && this.url) {

          this.#isLoadingRequested = false;

          const fetchInitUrl = new URL(initUrl, this.url);
  
          let initData = {};
  
          if (this.options.lang) {
            initData.lang = this.options.lang;
          }
    
          if (this.options.tz) {
            initData.tz = this.options.tz;
          }

          if (this.options.version) {
            initData.version = this.options.version;
          }

          console.log("init", initData)

          /**
           * @type {WeavyEnvironmentData}
           */
          var clientData = await this.fetch(
            fetchInitUrl,
            initData,
            "POST",
            null,
            true
          );
  
          this.#isLoading = false;
  
          if (!clientData) {
            throw new Error("Error loading client data");
          }
  
          this.data = clientData;
          
          this.#whenLoaded.resolve();
        }
      })
  
    }

    await Promise.all([
      this.authentication.whenAuthenticated(),
      this.#whenLoaded()
    ])
  }

  /**
   * Method for calling JSON API endpoints on the server. You may send data along with the request or retrieve data from the server.
   *
   * Fetch API is used internally and you may override or extend any settings in the {@link https://developer.mozilla.org/en-US/docs/Web/API/Fetch_API MDN: Fetch API} by providing custom {@link https://developer.mozilla.org/en-US/docs/Web/API/fetch#options MDN: fetch settings}.
   *
   * You may of course call the endpoints using any other preferred fetch or AJAX method, but this method is pre configured with proper encoding and cross domain settings.
   *
   * @param {string|URL} url - URL to the JSON endpoint. May be relative to the connected server.
   * @param {object} [data] - Data to send. May be an object that will be encoded or a string with pre encoded data.
   * @param {string} [method=GET] - HTTP Request Method {@link https://developer.mozilla.org/en-US/docs/Web/HTTP/Methods MDN: Methods}
   * @param {object} [settings] - Settings to extend or override {@link https://developer.mozilla.org/en-US/docs/Web/API/fetch#options MDN: fetch settings}.
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

    if (response.status === 400 || response.status === 401 || response.status === 403) {
      console.warn("fetch: access token failed, trying again");

      let token = await this.#authentication.getAccessToken(true);
      settings.headers.Authorization = "Bearer " + token;

      response = await window.fetch(url.toString(), settings);
    }

    return processJSONResponse(response);
  }
}

export default new WeavyUrlClassManager(WeavyEnvironment);