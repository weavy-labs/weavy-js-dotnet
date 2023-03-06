/* global WEAVY_VERSION, WEAVY_DEVELOPMENT */

import WeavyEvents from './utils/events';
import { assign, S4, asArray, eqObjects, asElement, sanitizeJSON, processJSONResponse, isPlainObject } from './utils/utils';
import WeavyConsole from './utils/console';
import WeavyPromise from './utils/promise';
import WeavyPostal from './utils/postal-parent';

import WeavyRoot from './dom-root';
import WeavyPanels from './panels';
import WeavyOverlays from './overlays';
import WeavyNavigation from './navigation';
import WeavyHistory from './history';
import WeavyAuthentications from './authentication';
import WeavyApp from './app';

console.info("weavy.js");

const initUrl = "/dropin/client/init";
const semverRegEx = /(?<major>\d+)\.(?<minor>\d+)\.(?<patch>\d+)(?:[-](?<prerelease>[^+]+))?(?:[+](?<build>\S+))?/

// WEAVY

var _weavyIds = [];

/**
 * All options are optional. You may use multiple Weavy.presets together with options when constructing a weavy instance. Multiple option sets are merged together.
 * 
 * If you want to connect to a specific server use the [url option]{@link Weavy#options}.
 * 
 * These option presets are available for easy configuration
 * * Weavy.presets.noplugins - Disable all plugins
 * * Weavy.presets.core - Use the minimal core plugin configuration without additional plugins.
 * 
 * @example
 * var weavy = new Weavy();
 * 
 * var devSettings = {
 *     logging: true
 * };
 * 
 * var coreDevWeavy = new Weavy(Weavy.presets.core, devSettings, { url: "http://myweavysite.dev" });
 * 
 * @class Weavy
 * @classdesc The core class for the Weavy client.
 * @param {...Weavy#options} options - One or multiple option sets. Options will be merged together in order.
 */

var Weavy = function () {
  /** 
   * Reference to this instance
   * @lends Weavy#
   */
  var weavy = this;

  /**
   * Main options for Weavy. The `url` and `tokenFactory` option is required.
   * When weavy initializes, it connects to the server and processes the options as well as using them internally. 
   * 
   * @see [Client Options]{@link https://docs.weavy.com/client/development/options}
   * @typedef 
   * @type {Object}
   * @member
   * @property {Element} [container] - Container where weavy should be placed. If no Element is provided, a &lt;weavy&gt; root is created next to the &lt;body&gt;-element.
   * @property {string} [className] - Additional classNames added to weavy.
   * @property {string} [css] - Custom CSS styles applied in all apps.
   * @property {string} [https=adaptive] - How to enforce https-links. <br> • **force** -  makes urls https.<br> • **adaptive** - enforces https if the calling site uses https.<br> • **default** - makes no change.
   * @property {string} [id] - An id for the instance. A unique id is always generated.
   * @property {function} tokenFactory - The async function returning a string access token passed to {@link WeavyAuthentication}.
   * @property {boolean} [init=true] - Should weavy initialize automatically?
   * @property {boolean} [includePlugins=true] - Whether all registered plugins should be enabled by default. If false, then each plugin needs to be enabled in plugin-options.
   * @property {boolean} [includeStyles=true] - Whether default styles should be enabled. If false, you need to provide a custom stylesheet.
   * @property {boolean} [includeExternalStyles=true] - Whether external styles should be parsed. If false, you can only provide styles via options.
   * @property {boolean} [includeFont=true] - Whether fonts applied in containers should be inherited by default. If false, you may have to provide styles for the font.
   * @property {boolean} [includeThemeColor=true] - Whether a meta theme-color defined in head should be used as default. If false, you may have to provide styles for the colors.
   * @property {string} [lang] - [Language code]{@link https://en.wikipedia.org/wiki/ISO_639-1} of preferred user interface language, e.g. <code>en</code> for English. When set, it must match one of your [configured languages]{@link https://docs.weavy.com/server/localization}.
   * @property {Object|boolean} [logging] - Options for console logging. Set to false to disable.
   * @property {string} [logging.color] - Hex color (#bada55) used for logging. A random color is generated as default.
   * @property {boolean} [logging.log] - Enable log messages in console.
   * @property {boolean} [logging.debug] - Enable debug messages in console.
   * @property {boolean} [logging.info] - Enable info messages in console.
   * @property {boolean} [logging.warn] - Enable warn messages in console.
   * @property {boolean} [logging.error] - Enable error messages in console.
   * @property {Object.<string, Object>} [plugins] - Properties with the name of the plugins to configure. Each plugin may be enabled or disabled by setting the options to true or false. Providing an Object instead of true will enable the plugin and pass options to the plugin. See the reference for each plugin for available options.
   * @property {boolean} [preload] - Start automatic preloading after load
   * @property {boolean} [shadowMode=closed] - Set whether ShadowRoots should be `closed` or `open` (not recommended).
   * @property {Array.<WeavyApp#options>} apps - Array of app definititions to initialize directly at initialization. See {@link Weavy#app}.
   * @property {string} [tz] - Timezone identifier, e.g. <code>Pacific Standard Time</code>. When specified, this setting overrides the timezone setting on a user´s profile. The list of valid timezone identifiers can depend on the version and operating system of your Weavy server.
   * @property {string} [url] - The URL of the Weavy-installation to connect to. Defaults to the installation where the script came from.
   */
  weavy.options = assign(Weavy.defaults);

  // Extend default options with the passed in arguments
  for (var arg in arguments) {
    if (arguments[arg] && typeof arguments[arg] === "object") {
      weavy.options = assign(weavy.options, arguments[arg], true);
    }
  }

  /**
   * Supporting function for generating an id
   * @ignore
   * @param {string} id 
   * @returns {string}
   */
  function generateId(id) {
    id = "wy-" + (id ? id.replace(new RegExp("^wy-"), '') : S4() + S4());

    // Make sure id is unique
    if (_weavyIds.indexOf(id) !== -1) {
      id = generateId(id + S4());
    }

    return id;
  }

  var _id = generateId(weavy.options.id);

  /**
   * The weavy instance id
   * @member {string} Weavy#id
   **/
  Object.defineProperty(weavy, "id", { get: function () { return _id } });

  _weavyIds.push(weavy.id);

  // Logging

  /**
   * Class for wrapping native console logging.
   * - Options for turning on/off logging
   * - Optional prefix by id with color
   * 
   * @type {WeavyConsole}
   * @category logging
   * @borrows WeavyConsole#log as Weavy#log
   * @borrows WeavyConsole#debug as Weavy#debug
   * @borrows WeavyConsole#warn as Weavy#warn
   * @borrows WeavyConsole#error as Weavy#error
   * @borrows WeavyConsole#info as Weavy#info
   */
  weavy.console = new WeavyConsole(this, weavy.options.logging);

  weavy.log = weavy.console.log;
  weavy.debug = weavy.console.debug;
  weavy.warn = weavy.console.warn;
  weavy.error = weavy.console.error;
  weavy.info = weavy.console.info;

  // ID functions

  /**
   * Appends the weavy-id to an id. This makes the id unique per weavy instance. You may define a specific weavy-id for the instance in the {@link Weavy#options}. If no id is provided it only returns the weavy id. The weavy id will not be appended more than once.
   * 
   * @param {string} [id] - Any id that should be completed with the weavy id.
   * @returns {string} Id completed with weavy-id. If no id was provided it returns the weavy-id only.
   */
  weavy.getId = function (id) {
    return id ? weavy.removeId(id) + "__" + weavy.id : weavy.id;
  }

  /**
   * Removes the weavy id from an id created with {@link Weavy#getId}
   * 
   * @param {string} id - The id from which the weavy id will be removed.
   * @returns {string} Id without weavy id.
   */
  weavy.removeId = function (id) {
    return id ? String(id).replace(new RegExp("__" + weavy.getId() + "$"), '') : id;
  };

  /**
   * The hardcoded semver version of the weavy-script.
   * @member {string} Weavy#version
   */
  Object.defineProperty(weavy, 'version', {
    get: function () { return Weavy.version; },
    configurable: false
  });

  if (weavy.version) {
    weavy.log(weavy.version);
  }

  // Weavy URL
  var _url;

  try {
    if (!weavy.options.url || weavy.options.url === "/" || !new URL(weavy.options.url)) {
      throw new Error();
    } else {
      _url = weavy.options.url;

      // Check protocol
      if (weavy.options.https === "enforce") {
        _url = _url.replace(/^http:/, "https:");
      } else if (weavy.options.https === "adaptive") {
        _url = _url.replace(/^http:/, window.location.protocol);
      }
    }
  } catch (e) {
    weavy.error("Required url not specified.\nnew Weavy({ url: \"https://mytestsite.weavycloud.com/\" })");
    return;
  }

  /**
   * The url of the weavy server.
   * 
   * @member {URL} Weavy#url
   **/
  Object.defineProperty(weavy, "url", { get: function () { return new URL(_url); } });


  /**
   * Data about the current user.
   * Use weavy.user.id to get the id of the user.
   * 
   * @category authentication
   * @type {Object}
   */
  weavy.user = null;


  /**
   * Client configuration data from the server. Based on what is passed in {@link Weavy#options} to the server and currently defined apps.
   * 
   * @typedef
   * @type {Object}
   * @property {Array.<WeavyApp#data>} apps - List of configured apps.
   * @property {Object} plugins - Options for configured plugins.
   * @property {string} status - Status of the server. Should be "ok".
   * @property {string} version - Semver string of the server version. Should match the script {@link Weavy.version}.
   **/
  weavy.data = null;

  /**
   * True when inatialization has started
   * 
   * @type {boolean}
   */
  weavy.isInitialized = false;

  /**
   * True when frames are blocked by Content Policy or the browser
   * 
   * @type {boolean}
   */
  weavy.isBlocked = false;

  /**
   * True when weavy has built all roots and nodes.
   * 
   * @type {boolean}
   */
  weavy.isBuilt = false;

  /**
   * True when weavy is loading options from the server.
   * 
   * @type {boolean}
   */
  weavy.isLoading = false;

  /**
   * True when weavy has loaded and built and all apps are initialized.
   * 
   * @type {boolean}
   */
  weavy.isLoaded = false;


  // EVENT HANDLING

  /**
   * Instance of {@link WeavyEvents} which enables propagation and before and after phases for events.
   *
   * The event system provides event chaining with a bubbling mechanism that propagates all the way from the emitting child trigger to the weavy instance.
   * 
   * All events in the client have three phases; before, on and after. Each event phase is a prefix to the event name.
   * - The before:event-name is triggered in an early stage of the event cycle and is a good point to modify event data or cancel the event.
   * - The on:event-name is the normal trigger point for the event. It does not need to be prefixed when registering an event listener, you can simly use the event-name when you register a listener. This is the phase you normally use to register event listeners.
   * - The after:event-name is triggered when everything is processed. This is a good point to execute code that is dependent on that all other listers have been executed.
   * 
   * Cancelling an event by calling `event.stopPropagation()` will stop any propagation and cause all the following phases for the event to be cancelled.
   * 
   * @type {WeavyEvents}
   * @category eventhandling
   * @borrows WeavyEvents#on as Weavy#on
   * @borrows WeavyEvents#one as Weavy#one
   * @borrows WeavyEvents#off as Weavy#off
   * @borrows WeavyEvents#triggerEvent as Weavy#triggerEvent
   **/
  weavy.events = new WeavyEvents(weavy);
  weavy.on = weavy.events.on;
  weavy.one = weavy.events.one;
  weavy.off = weavy.events.off;
  weavy.triggerEvent = weavy.events.triggerEvent;


  // AUTHENTICATION & ACCESS TOKEN

  /**
   * Reference to the instance of the WeavyAuthentication for the current server.
   * 
   * You always need to define an async token factory in your {@link Weavy#options}. 
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
  weavy.authentication = WeavyAuthentications.getAuthentication(weavy.url);

  if (weavy.options.tokenFactory === undefined && !weavy.authentication.isProvided()) {
    weavy.error("specify an async token factory in your options");
  }

  if (!weavy.authentication.isProvided() || !weavy.authentication.isInitialized()) {
    weavy.authentication.init(weavy.options.tokenFactory);
  }

  weavy.on(weavy.authentication, "user", function (e, auth) {
    weavy.user = auth.user;

    if (/^signed-in|signed-out|changed-user|user-error$/.test(auth.state)) {

      if (!weavy.isLoading) {
        if (weavy.isLoaded) {
          weavy.whenLoaded.reset();
        }
        weavy.isLoaded = false;
        weavy.data = null;
      }


      if (auth.state === "changed-user") {
        // TODO: document these events
        weavy.triggerEvent("signed-out", { id: -1 });
        weavy.triggerEvent("signed-in", auth);
      } else {
        weavy.triggerEvent(auth.state, auth);
      }

      // Refresh client data
      loadClientData();
    }
  });

  weavy.on(weavy.authentication, "signing-in", function () {
    /**
     * Triggered when the authentication process has started.
     * @event Weavy#signing-in
     * @category authentication
     */
    weavy.triggerEvent("signing-in");
  });

  weavy.on(weavy.authentication, "clear-user", function () {
    /**
     * Triggered when user data needs to be cleared. For example when a user is signing out.
     * @event Weavy#clear-user
     * @category authentication
     */
    weavy.triggerEvent("clear-user");
  });

  weavy.on(weavy.authentication, "authentication-error", function (e, error) {
    /**
     * Triggered when the authentication process was unsuccessful.
     * 
     * @event Weavy#authentication-error
     * @category authentication
     * @returns {Object}
     * @property {string} method - Which metod that was used to authenticate: "access_token"
     * @property {int} status - The HTTP error code from the server, like 401 for an unauthorized user
     * @property {string} message - The message from the server, like "Unauthorized"
     */
    weavy.triggerEvent("authentication-error", error);
  });


  // PANELS
  /**
   * Placeholder for all DOM node references. Put any created elements or DOM related objects here.
   * 
   * @category panels
   * @namespace Weavy#nodes
   * @typicalname .nodes
   * @type {Object}
   * @property {Element} container - The main container under the root. This is where all common weavy Elements are placed.
   * @property {Element} global - Container for displaying elements that needs to be full viewport and on top of other elements.
   */
  weavy.nodes = {};
  weavy.nodes.container = null;
  weavy.nodes.global = null;


  /**
   * Placeholder for all panels.
   * 
   * @type {Object}
   * @category panels
   * @namespace Weavy#nodes#panels
   * @typicalname .nodes.panels
   **/
  weavy.nodes.panels = {};

  /**
   * Instance of the panel manager for all iframes in the weavy instance.
   * 
   * @type {WeavyPanels}
   * @category panels
   **/
  weavy.panels = new WeavyPanels(weavy);

  /**
   * Instance of the overlay manager for all overlays in the weavy instance.
   * 
   * @type {WeavyPanels}
   * @category panels
   **/
  weavy.overlays = new WeavyOverlays(weavy);


  // APPS

  /**
   * List of all current defined apps as an Array.
   * @category apps
   * @type {Array.<WeavyApp>}
   **/
  weavy.apps = new Array();

  /**
   * Selects, fetches or creates an app.
   *
   * The app needs to be defined using an app definition object containing at least an id, which will fetch or create the app on the server.
   * If the defined app already has been defined, the app will only be selected in the client.
   * After the app is defined it can be quickly selected in the client using only the uid (string) of the app, which never will create nor fetch the app from the server.
   *
   * @example
   * // Define an app that will be fetched or created on the server
   * var app = weavy.app({ uid: "my_uid", type: "files", container: "#mycontainer" });
   *
   * // Select the newly defined app
   * var appAgain = weavy.app("my_uid");
   *
   * @category apps
   * @function Weavy#app
   * @param {string|WeavyApp#options} options - app uid or app definition object.
   * @returns {WeavyApp}
   */
  weavy.app = WeavyApp.select.bind(this, weavy, weavy.apps);


  // TIMEOUT HANDLING 

  var _timeouts = [];

  /**
   * Clears all current timouts 
   **/
  function clearTimeouts() {
    _timeouts.forEach(clearTimeout);
    _timeouts = [];
  }


  /**
   * Creates a managed timeout promise. Use this instead of window.setTimeout to get a timeout that is automatically managed and unregistered on destroy.
   * 
   * @example
   * var mytimeout = weavy.whenTimeout(200).then(function() { ... });
   * mytimeout.cancel(); // Cancel the timeout
   * 
   * @category promises
   * @function
   * @param {int} time=0 - Timeout in milliseconds
   * @returns {WeavyPromise}
   */
  weavy.whenTimeout = function (time) {
    var timeoutId;
    var whenTimeout = new WeavyPromise();

    var removeIndex = function () {
      var timeoutIndex = _timeouts.indexOf(timeoutId);
      if (timeoutIndex >= 0) {
        _timeouts.splice(timeoutIndex, 1);
      }
    }

    _timeouts.push(timeoutId = setTimeout(function () { whenTimeout.resolve(); }, time));

    whenTimeout.then(removeIndex);
    whenTimeout.catch(function () {
      removeIndex();
      clearTimeout(timeoutId);
      return Promise.reject(new Error("Timeout cancelled"));
    });

    whenTimeout.cancel = function () {
      removeIndex();
      clearTimeout(timeoutId);
    }

    return whenTimeout;
  };

  // PROMISES

  /**
   * Promise that the blocking check has finished. Resolves when {@link Weavy#event:frame-check} is triggered.
   *
   * @example
   * weavy.whenReady().then(function() { ... })
   *
   * @category promises
   * @function
   * @returns {WeavyPromise}
   * @resolved when frames are not blocked.
   * @rejected when frames are blocked
   * */
  weavy.whenReady = new WeavyPromise();

  /**
   * Promise that resolves when the initialization has been started
   * 
   * @category promises
   * @function
   * @returns {WeavyPromise}
   * @resolved when init event has been fully executed
   */
  weavy.whenInitialized = new WeavyPromise();

  /**
   * Promise that weavy has built all roots and nodes
   *
   * @example
   * weavy.whenBuilt().then(function() { ... })
   *
   * @category promises
   * @function
   * @returns {WeavyPromise}
   * @resolved when init is called, the websocket has connected, data is received from the server and weavy is built and the load event has finished.
   */
  weavy.whenBuilt = new WeavyPromise();

  /**
   * Promise that weavy has loaded built and all apps are initialized.
   *
   * @example
   * weavy.whenLoaded().then(function() { ... })
   *
   * @category promises
   * @function
   * @returns {WeavyPromise}
   * @resolved when init is called, the websocket has connected, data is received from the server and weavy is built and the load event has finished.
   */
  weavy.whenLoaded = new WeavyPromise();

  // Register init before any plugins do
  weavy.on("init", function () {

    // Prepopulate apps
    if (weavy.options.apps) {
      weavy.warn("Defining apps in weavy instance options is deprecated. Use weavy.app({ ...appOptions }) instead.");
      
      var apps = asArray(weavy.options.apps);

      apps.forEach(function (appOptions) {
        weavy.app(appOptions);
      });
    }

    loadClientData().then(function () {
      frameStatusCheck.call(weavy).then(function () {
        weavy.whenReady.resolve();
      });

      weavy.on("message", { name: "authenticate" }, () => weavy.authentication.checkUserState("postal:authenticate"));

      /*
        // Check user state when connection has been reconnected
        weavy.on(weavy.realtime, "reconnected.connection", function () {
          if (weavy.authentication.isAuthenticated()) {
            // Check if user state is still valid
            weavy.authentication.checkUserState("connection:reconnected");
          }
        });
      */

    });
  });

  weavy.on("after:init", function () {
    weavy.isInitialized = true;
    weavy.whenInitialized.resolve();
  });

  /**
   * Initializes weavy. This is done automatically unless you specify `init: false` in {@link Weavy#options}.
   * 
   * @param {Weavy#options} [options] Any new or additional options.
   * @emits Weavy#init
   * @returns {Weavy#whenInitialized}
   * @resolved When the weavy instance is initialized, ready and loaded.
   */
  weavy.init = function (options) {

    weavy.options = assign(weavy.options, options);

    /**
     * Event that is triggered when the weavy instance is initiated. This is done automatically unless you specify `init: false` in {@link Weavy#options}.
     * You may use the `before:init` event together with `event.stopPropagation()` if you want to intercept the initialization.
     * 
     * @category events
     * @event Weavy#init
     * @returns {Promise}
     */
    weavy.triggerEvent("init");

    return weavy.whenInitialized();
  }

  function allAppsInitialized() {
    var appsInitialized = weavy.apps.reduce(function (allAppsInitialized, app) {
      // Check if app is loaded
      return allAppsInitialized && app.isInitialized;
    }, true);

    return appsInitialized;
  }

  function whenAllAppsInitialized() {
    if (allAppsInitialized()) {
      return WeavyPromise.resolve();
    } else {
      var appsInitialized = weavy.apps.reduce(function (initPromises, app) {
        // Append app init promise
        initPromises.push(app.whenInitialized());
        return initPromises;
      }, []);

      // Try again when all current promises are fulfilled
      return Promise.all(appsInitialized).then(whenAllAppsInitialized);
    }
  }

  // INTERNAL FUNCTIONS

  function loadClientData() {
    var whenClientData = new WeavyPromise();

    if (!weavy.isLoading) {
      if (weavy.isLoaded) {
        weavy.whenLoaded.reset();
      }

      weavy.isLoaded = false;
      weavy.isLoading = true;

      weavy.options.href = window.location.href;

      var fetchInitUrl = new URL(initUrl, weavy.url).href;

      var initData = {
        plugins: weavy.options.plugins,
        version: weavy.version
      }

      if (weavy.options.lang) {
        initData.lang = weavy.options.lang;
      }
      if (weavy.options.tz) {
        initData.tz = weavy.options.tz;
      }
      if (weavy.options.theme) {
        initData.theme = weavy.options.theme;
      }

      weavy.fetch(fetchInitUrl, initData, "POST", null, true).then(function (clientData) {

        /**
         * Triggered when init data has been loaded from the server.
         * 
         * @event Weavy#client-data
         * @category events
         * @returns {Weavy#data}
         **/
        weavy.triggerEvent("client-data", clientData);
        whenClientData.resolve();
      });
    }
    return whenClientData();
  }

  weavy.on("client-data", function (e, clientData) {

    weavy.data = clientData;

    weavy.isLoading = false;

    if (!clientData) {
      weavy.error("Error loading client data");
      weavy.whenLoaded.reject();
      return;
    }

    let clientVersion = semverRegEx.exec(weavy.version);
    let serverVersion = semverRegEx.exec(weavy.data.version)

    // Do a script version mismatch check
    if (clientVersion && serverVersion) {
      // Skip build info in comparison
      delete clientVersion.groups.build;
      delete serverVersion.groups.build;

      if (!eqObjects(clientVersion.groups, serverVersion.groups, true)) {
        let versionMismatchMessage = "Weavy client/server version mismatch! \nclient: " + weavy.version + " \nserver: " + weavy.data.version;
        
        let majorMatch = clientVersion.groups.major === serverVersion.groups.major;
        let minorMatch = clientVersion.groups.minor === serverVersion.groups.minor;
        
        if (majorMatch && minorMatch || WEAVY_DEVELOPMENT) {
          weavy.warn(versionMismatchMessage);
        } else {
          weavy.error(versionMismatchMessage);
        }
      }
    }

    if (weavy.isBuilt === false) {
      initRoot.call(weavy);

      /**
          * Event triggered when weavy is building up the DOM elements.
          * 
          * Use this event to build all your elements and attach them to weavy.
          * At this point you may safely assume that weavy.nodes.container is built.
          * 
          * Good practice is to build all elements in the build event and store them as properties on weavy.
          * Then you can attach them to other Elements in the after:build event.
          * This ensures that all Elements are built before they are attached to each other.
          *
          * If you have dependencies to Elements built by plugins you should also check that they actually exist before attaching to them.
          *
          * Often it's a good idea to check if the user is signed-in using {@link WeavyAuthentication#isAuthenticated} unless you're building something that doesn't require a signed in user.
          *
          * @example
          * weavy.on("build", function(e, root) {
          *     if (weavy.authentication.isAuthorized()) {
          *         weavy.nodes.myElement = document.createElement("DIV");
          *     }
          * });
          * 
          * weavy.on("after:build", function(e, root) {
          *     if (weavy.authentication.isAuthorized()) {
          *         if (weavy.nodes.global) {
          *             weavy.nodes.global.appendChild(weavy.nodes.myElement);
          *         }
          *     }
          * })
          *
          * @category events
          * @event Weavy#build
          */
      weavy.triggerEvent("build", { container: weavy.nodes.container, global: weavy.nodes.global });

      weavy.isBuilt = true;
      weavy.whenBuilt.resolve();
    }

    Promise.all([whenAllAppsInitialized(), weavy.whenReady()]).then(function () {
      /**
        * Event triggered when weavy has initialized, connected to the server and recieved and processed options, and built all components.
        * Use this event to do stuff when everything is loaded.
        * 
        * Often it's a good idea to check if the user is signed-in using {@link Weavy#isAuthenticated} unless you're building something that doesn't require a signed in user.
        * 
        * @example
        * weavy.on("load", function() {
        *     if (weavy.authentication.isAuthorized()) {
        *         weavy.dialog("Client successfully loaded");
        *     }
        * });
        * 
        * @category events
        * @event Weavy#load
        */
      weavy.triggerEvent("load");

      weavy.isLoaded = true;
      weavy.whenLoaded.resolve();
    });

  });

  // ROOTS AND DOM

  var _roots = new Map();

  /**
   * Get a Weavy shadow root by id.
   * 
   * @param {string} id - The id of the root.
   * @returns {Weavy~root}
   */
  weavy.getRoot = function (id) {
    return _roots.get(weavy.getId(id));
  }

  /**
   * Creates an isolated shadow root in the DOM tree to place nodes in.
   * 
   * @param {Element|string} parentSelector - The node to place the root in.
   * @param {string} id - Id of the root.
   * @param {Object} [eventParent] - The parent to receive events from the root
   * @emits Weavy#root-create
   * @returns {Weavy~root}
   */
  weavy.createRoot = function (parentSelector, id, eventParent) {
    // TODO: MAKE CREATEROOT ASYNC?

    var rootId = weavy.getId(id);
    var parentElement = asElement(parentSelector);

    if (!parentElement) {
      weavy.error("No parent container defined for createRoot", rootId);
      return;
    }
    if (_roots.has(rootId)) {
      weavy.warn("Root already created", rootId);
      return _roots.get(rootId);
    }

    var root = new WeavyRoot(weavy, parentElement, rootId, eventParent);

    root.on("root-remove", () => _roots.delete(rootId));

    _roots.set(rootId, root);

    return root;
  };

  /**
   * Creates the general weavy root where overlays etc are placed.
   **/
  function initRoot() {
    // add container
    if (!weavy.getRoot()) {
      // append container to target element || html
      var rootParent = asElement(weavy.options.container) || document.documentElement;
      var root = weavy.root = weavy.createRoot.call(weavy, rootParent);
      weavy.nodes.container = root.root;
      weavy.nodes.global = root.container;

      weavy.root.className = "wy-viewport";
    }
  }

  // CSS

  var _css = weavy.options.css || '';

  /**
   * General CSS styles.
   * 
   * @member {String} Weavy#css
   **/
  Object.defineProperty(weavy, "css", { 
    get: function () { return _css; },
    set: function (css) {
      _css = css;
      weavy.triggerEvent("update-css", { css });
    }
  });

  var _className = weavy.options.className || '';

  /**
   * General CSS className.
   * 
   * @member {String} Weavy#className
   **/
    Object.defineProperty(weavy, "className", { 
    get: function () { return _className; },
    set: function (className) {
      _className = className;
      weavy.triggerEvent("update-class-name", { className });
    }
  });

  // STATUS CHECK

  /**
   * Checks that frame communication is not blocked.
   **/
  function frameStatusCheck() {
    var statusUrl = new URL("/dropin/client/ping", weavy.url);

    var storageAccessAvailable = 'hasStorageAccess' in document;

    var whenFrameCookiesChecked = new WeavyPromise();
    var whenFrameCookiesEnabled = new WeavyPromise();
    var whenFrameStatusCheck = new WeavyPromise();
    var whenFrameReady = new WeavyPromise();

    var whenStatusTimeout = weavy.whenTimeout(3000);

    var dialogCookie, dialogStorage;

    if (!weavy.nodes.statusFrame) {
      weavy.log("Frame Check: Started...");

      // frame status checking
      var statusFrame = weavy.nodes.statusFrame = document.createElement("iframe");
      statusFrame.className = "wy-status-check";
      statusFrame.hidden = true;
      statusFrame.id = weavy.getId("status-check");
      statusFrame.setAttribute("name", weavy.getId("status-check"));

      var requestStorageAccess = function () {
        whenStatusTimeout.cancel();
        
        var msgText = asElement('<div class="wy-text">Third party cookies are required to use this page.</div>')
        var msgButton = asElement('<button class="wy-button">Enable cookies</button>');

        var storageAccessWindow;

        msgButton.onclick = function () {
          weavy.log('Frame Check: Opening storage access request');
          storageAccessWindow = window.open(new URL('/dropin/client/cookie-access', weavy.url), weavy.getId("storage-access"));
          WeavyPostal.registerContentWindow(storageAccessWindow, weavy.getId("storage-access"), weavy.getId(), weavy.url.origin);
          weavy.one(WeavyPostal, "ready", { weavyId: weavy.getId(), windowName: weavy.getId("storage-access") }, () => {
            let styles = weavy.root.styles.getAllCSS();
            let className = weavy.className;
            let styleMessage = { name: "styles", id: null, css: styles, className: className };
            WeavyPostal.postToFrame(weavy.getId("storage-access"), weavy.getId(), styleMessage);
          })
        };

        var msg = document.createElement('template').content;
        msg.append(msgText, msgButton);

        if (weavy.plugins.dialog) {
          dialogStorage = weavy.dialog(msg, true);
        }

        weavy.one(WeavyPostal, "storage-access-granted", { weavyId: true, domain: weavy.url.origin }, function () {
          weavy.log("Frame Check: Storage access was granted, authenticating and reloading status check.");

          if (dialogCookie) {
            dialogCookie.remove();
            dialogCookie = null;
          }

          if (dialogStorage) {
            dialogStorage.remove();
            dialogStorage = null;
          }
          let weavyId = weavy.getId();

          weavy.authentication.signIn().then(function () {
            weavy.debug("Frame Check: reloading status check")
            WeavyPostal.postToFrame(weavy.getId("status-check"), weavyId, { name: "reload" });
          });
        });

      };

      weavy.on(WeavyPostal, "user-status", { weavyId: weavy.getId(), windowName: weavy.getId("status-check") }, function (e, userStatus) {
        var cookieIsValid = parseInt(userStatus.id) === parseInt(weavy.authentication.user().id);
        weavy.debug("Frame Check: user-status received", cookieIsValid);
        whenFrameCookiesChecked.resolve(cookieIsValid);

        if (!cookieIsValid) {
          if (storageAccessAvailable) {
            requestStorageAccess();
          } else if (!storageAccessAvailable) {
            if (weavy.plugins.toast) {
              dialogCookie = weavy.dialog('Allow third party cookies to use this page.');
            }
          }
        } else {
          whenFrameCookiesEnabled.resolve();
        }
      });


      weavy.one(WeavyPostal, "ready", { weavyId: weavy.getId(), windowName: weavy.getId("status-check") }, function () {
        weavy.debug("Frame Check: frame ready")
        whenFrameReady.resolve();
      });


      // Frame network investigator triggered when status frame timeout
      whenStatusTimeout.then(function () {
        weavy.fetch(statusUrl).then(function (response) {
          weavy.warn("Status check timeout. Please make sure your web server is properly configured.")

          if (response.ok) {
            if (response.headers.has("X-Frame-Options")) {
              let frameOptions = response.headers.get("X-Frame-Options");
              if (frameOptions === "DENY" || frameOptions === "SAMEORIGIN" && statusUrl.origin !== window.location.origin) {
                return Promise.reject(new Error("Frames are blocked by header X-Frame-Options"));
              }
            }

            if (response.headers.has("Content-Security-Policy")) {
              let secPolicy = response.headers.get("Content-Security-Policy").split(";");

              let frameAncestors = secPolicy.filter(function (policy) {
                return policy.indexOf('frame-ancestors') === 0;
              }).pop();

              if (frameAncestors) {
                let faDomains = frameAncestors.split(" ");
                faDomains.splice(0, 1);

                let matchingDomains = faDomains.filter(function (domain) {
                  if (domain === "'self'" && weavy.url.origin === window.location.origin) {
                    return true;
                  } else if (domain.indexOf("*")) {
                    return window.location.origin.endsWith(domain.split("*").pop())
                  } else if (domain === window.location.origin) {
                    return true;
                  }
                  return false;
                });

                if (!matchingDomains.length) {
                  return Promise.reject(new Error("Frames blocked by header Content-Security-Policy: frame-ancestors"));
                }
              }
            }
          } else {
            return Promise.reject(new Error("Error fetching status url: " + response.statusText));
          }
        }).catch(function (error) {
          weavy.error("Frame status error detected: " + error.message);
        })
      });

      weavy.nodes.container.appendChild(weavy.nodes.statusFrame);

      weavy.whenTimeout(1).then(function () {
        weavy.nodes.statusFrame.src = statusUrl.href;
        weavy.isBlocked = true;

        try {
          WeavyPostal.registerContentWindow(weavy.nodes.statusFrame.contentWindow, weavy.getId("status-check"), weavy.getId(), weavy.url.origin);
        } catch (e) {
          weavy.warn("Frame postMessage is blocked", e);
          weavy.triggerEvent("frame-check", { blocked: true });
        }
      });

      return Promise.all([whenFrameReady(), whenFrameCookiesEnabled()]).then(function () {
        weavy.log("Frame Check:", "OK");
        weavy.isBlocked = false;

        whenStatusTimeout.cancel();

        if (dialogCookie) {
          dialogCookie.remove();
          dialogCookie = null;
        }

        if (dialogStorage) {
          dialogStorage.remove();
          dialogStorage = null;
        }

        /**
         * Triggered when the frame check is done.
         * 
         * @category events
         * @event Weavy#frame-check
         * @returns {WeavyPromise}
         * @property {boolean} blocked - Whether iframes communication is blocked or not.
         * @resolves {WeavyPromise}
         **/
        weavy.triggerEvent("frame-check", { blocked: false });
        whenFrameStatusCheck.resolve({ blocked: false });
        return whenFrameStatusCheck();
      }).catch(function (error) {
        weavy.triggerEvent("frame-check", { blocked: true });
        whenFrameStatusCheck.reject(new Error("Frame check failed: " + error.message));
        return whenFrameStatusCheck();
      });
    }
  }


  // PUBLIC METHODS


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
  weavy.fetch = function (url, data, method, settings) {
    url = new URL(url, weavy.url);
    method = method || "GET";
    data = data && typeof data === "string" && data || method !== "GET" && data && JSON.stringify(data, sanitizeJSON) || data || "";

    var isUnique = !!(method !== "GET" || data);
    var isSameOrigin = url.origin === weavy.url.origin;

    if (!isSameOrigin) {
      return Promise.reject(new Error("weavy.fetch: Only requests to the weavy server are allowed."))
    }

    settings = assign({
      method: method,
      mode: 'cors', // no-cors, *cors, same-origin
      cache: isUnique ? 'no-cache' : 'default', // *default, no-cache, reload, force-cache, only-if-cached
      credentials: 'include', // include, *same-origin, omit
      headers: {
        'Content-Type': 'application/json',
        // 'Content-Type': 'application/x-www-form-urlencoded',
        // https://stackoverflow.com/questions/8163703/cross-domain-ajax-doesnt-send-x-requested-with-header
        "X-Requested-With": "XMLHttpRequest"
      },
      redirect: 'manual', // manual, *follow, error
      referrerPolicy: "no-referrer-when-downgrade", // no-referrer, *no-referrer-when-downgrade, origin, origin-when-cross-origin, same-origin, strict-origin, strict-origin-when-cross-origin, unsafe-url
    }, settings, true);

    if (data && method !== "GET") {
      settings.body = data // body data type must match "Content-Type" header
    } else if (data) {
      let urlData = new URLSearchParams(data);
      url.search = (url.search ? url.search + "&" : "") + urlData.toString();
    }
    return weavy.authentication.whenAuthenticated().then(function () {
      return weavy.authentication.getAccessToken().then(function (token) {
        if (typeof token !== "string") {
          return Promise.reject(new Error("weavy.fetch: Provided access token is empty!"))
        }

        // access token configured, use bearer token
        settings.headers.Authorization = "Bearer " + token;

        return window.fetch(url.toString(), settings).then(function (response) {
          if (response.status === 401 || response.status === 403) {
            weavy.warn("weavy.fetch: access token failed, trying again");
            return weavy.authentication.getAccessToken(true).then(function (token) {
              settings.headers.Authorization = "Bearer " + token;
              return window.fetch(url.toString(), settings);
            })
          }
          return response;
        }).then(processJSONResponse).catch(function (error) {
          weavy.error("weavy.fetch: request failed!", error.message);
          return Promise.reject(error);
        });
      })
    });
  }

  /**
   * Destroys the instance of Weavy. You should also remove any references to weavy after you have destroyed it. The [destroy event]{@link Weavy#event:destroy} will be triggered before anything else is removed so that plugins etc may unregister and clean up, before the instance is gone.
   * @emits Weavy#destroy
   * @returns {Promise}
   */
  weavy.destroy = function () {
    var whenDestroyed = new WeavyPromise();
    var waitFor = [];

    /**
     * Event triggered when the Weavy instance is about to be destroyed. Use this event for clean up. 
     * - Any events registered using {@link Weavy#on} and {@link Weavy#one} will be unregistered automatically. 
     * - Timers using {@link Weavy#whenTimeout} will be cleared automatically.
     * - All elements under the {@link Weavy#nodes#root} will be removed.
     * 
     * @category events
     * @event Weavy#destroy
     * @returns {Object}
     * @property {Array} whenAllDestroyed - List of promises to wait for before destroy resolves. Add promises to wait for in your event handler.
    */
    var destroyResult = weavy.triggerEvent("destroy", { whenAllDestroyed: [] });

    if (destroyResult !== false) {

      Promise.all(destroyResult.whenAllDestroyed || []).then(function () {
        weavy.log("destroy: Removing roots");
        _roots.forEach(function (root) {
          root.remove();
        });

        weavy.log("destroy: clearing events");
        weavy.events.clear();

        clearTimeouts();

        // Unregister all content windows
        try {
          WeavyPostal.unregisterAll(weavy.getId());
        } catch (e) {
          weavy.warn("weavy.destroy: could not unregister postal content windows")
        }

        _weavyIds.splice(_weavyIds.indexOf(weavy.getId()), 1);

        // Delete everything in the instance
        for (var prop in weavy) {
          if (Object.prototype.hasOwnProperty.call(weavy, prop)) {
            delete weavy[prop];
          }
        }

        Promise.all(waitFor).then(function () {
          whenDestroyed.resolve();
        });
      }).catch(function () {
        whenDestroyed.reject();
      });
    } else {
      whenDestroyed.reject();
    }

    return whenDestroyed();
  }

 
  // NAVIGATION & HISTORY
  weavy.navigation = new WeavyNavigation(weavy);
  weavy.history = new WeavyHistory(weavy);

  // RUN PLUGINS

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
      if (Object.prototype.hasOwnProperty.call(_unsortedDependencies, pluginName)) {
        var plugin = _unsortedDependencies[pluginName];
        if (plugin.dependencies.length) {
          plugin.dependencies.forEach(function (dep) {
            // Check if plugin is enabled
            if (typeof Weavy.plugins[dep] !== "function") {
              weavy.error("plugin dependency needed by " + pluginName + " is not loaded/registered:", dep);
            } else if (!(weavy.options.includePlugins && weavy.options.plugins[dep] !== false || !weavy.options.includePlugins && weavy.options.plugins[dep])) {
              weavy.error("plugin dependency needed by " + pluginName + " is disabled:", dep);
            }

            if (_checkedDependencies.indexOf(dep) === -1) {
              _checkedDependencies.push(dep);
              sortByDependencies(dep);
            } else {
              weavy.error("You have circular Weavy plugin dependencies:", pluginName, dep);
            }
          });
        }

        if (Object.prototype.hasOwnProperty.call(_unsortedDependencies, pluginName)) {
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
        if (weavy.options.includePlugins && weavy.options.plugins[plugin] !== false || !weavy.options.includePlugins && weavy.options.plugins[plugin]) {
          _unsortedDependencies[plugin] = { name: plugin, dependencies: Array.isArray(Weavy.plugins[plugin].dependencies) ? Weavy.plugins[plugin].dependencies : [] };
        }
      } else {
        weavy.error("Registered plugin is not a plugin", plugin, typeof Weavy.plugins[plugin]);
      }
    }

    // Sort by dependencies
    sortByDependencies();

    for (var sortedPlugin in _sortedDependencies) {
      var plugin = _sortedDependencies[sortedPlugin].name;

      weavy.debug("Running Weavy plugin:", plugin);

      // Extend plugin options
      weavy.options.plugins[plugin] = assign(Weavy.plugins[plugin].defaults, isPlainObject(weavy.options.plugins[plugin]) ? weavy.options.plugins[plugin] : {}, true);

      // Run the plugin
      weavy.plugins[plugin] = new Weavy.plugins[plugin](weavy, weavy.options.plugins[plugin]) || true;
    }

  }

  // INIT
  if (weavy.options.init === true) {
    weavy.init();
  }
}

// PROTOTYPE EXTENDING

Object.defineProperty(Weavy.prototype, "type", { get: () => "Weavy" });

/**
 * Option preset configurations. Use these for simple configurations of common options. You may add your own presets also. 
 * The presets may be merged with custom options when you create a new Weavy, since the contructor accepts multiple option sets. 
 * 
 * @example
 * // Load the minimal weavy core without any additional plugins.
 * var weavy = new Weavy(Weavy.presets.core, { url: "https://myweavysite.com" });
 * 
 * @name Weavy.presets
 * @type {Object}
 * @property {Weavy#options} Weavy.presets.noplugins - Disable all plugins.
 * @property {Weavy#options} Weavy.presets.core - Enable all core plugins only.
 */
Weavy.presets = {
  noplugins: {
    includePlugins: false
  },
  core: {
    includePlugins: false,
    plugins: {
      alert: true,
      filebrowser: true,
      preview: true,
      theme: true
    }
  }
};

/**
 * Default options. These options are general for all Weavy instances and may be overridden in {@link Weavy#options}. 
 * You may add any general options you like here.
 * 
 * @example
 * // Defaults
 * Weavy.defaults = {
 *     container: null,
 *     className: "",
 *     https: "adaptive",
 *     init: true,
 *     includePlugins: true,
 *     includeStyles: true,
 *     includeFont: true,
 *     preload: true,
 *     url: "/"
 * };
 * 
 * // Set a general url to connect all weavy instances to
 * Weavy.defaults.url = "https://myweavysite.com";
 * var weavy = new Weavy();
 *
 * @type {Object}
 * @name Weavy.defaults
 * @property {Element} [container] - Container where weavy should be placed. If no Element is provided, a &lt;section&gt; is created next to the &lt;body&gt;-element.
 * @property {string} [className] - Additional classNames added to weavy.
 * @property {string} [https=adaptive] - How to enforce https-links. <br>• **force** -  makes urls https.<br>• **adaptive** -  enforces https if the calling site uses https.<br>• **default** - makes no change.
 * @property {boolean} [init=true] - Should weavy initialize automatically.
 * @property {boolean} [includePlugins=true] - Whether all registered plugins should be enabled by default. If false, then each plugin needs to be enabled in plugin-options.
 * @property {boolean} [includeStyles=true] - Whether default styles should be enabled by default. If false, you need to provide a custom stylesheet instead.
 * @property {boolean} [includeFont=true] - Whether fonts applied in containers should be inherited by default. If false, you may have to provide styles for the font.
 * @property {boolean} [includeThemeColor=true] - Whether a meta theme-color defined in head should be used as default. If false, you may have to provide styles for the colors.
 * @property {boolean} [preload] - Start automatic preloading after load
 * @property {boolean} [shadowMode=closed] - Set whether ShadowDOMs should be `closed` (recommended) or `open`.
 * @property {string} url - The URL to the Weavy-installation to connect to.
 */
Weavy.defaults = {
  container: null,
  https: "adaptive", // force, adaptive or default 
  init: true,
  includePlugins: true,
  includeStyles: true,
  includeFont: true,
  includeThemeColor: true,
  plugins: {
    deeplinks: false
  },
  preload: true,
  shadowMode: "closed",
  url: "/"
};

/**
 * Placeholder for registering plugins. Plugins must be registered and available here to be accessible and initialized in the Weavy instance. Register any plugins after you have loaded weavy.js and before you create a new Weavy instance.
 * 
 * @name Weavy.plugins
 * @type {Object.<string, plugin>}
 */
Weavy.plugins = {};

/**
 * Id list of all created instances.
 * @name Weavy.instances
 * @type {string[]}
 */
Object.defineProperty(Weavy, 'instances', {
  get: function () { return _weavyIds.slice(); },
  configurable: false
});

/**
 * The version of Weavy.
 * @name Weavy.version
 * @type {string[]}
 */
Object.defineProperty(Weavy, 'version', {
  get: function () { return WEAVY_VERSION; },
  configurable: false
});

export default Weavy;
