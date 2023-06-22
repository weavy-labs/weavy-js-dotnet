import { processJSONResponse, defaultFetchSettings } from "../utils/data";
import WeavyPromise from "../utils/promise";
import WeavyConsole from "../utils/console";
import WeavyEvents from "../utils/events";
import WeavyUrlClassManager from "../utils/url-class-manager";
import WeavyPostal from "../utils/postal-parent";

const ssoUrl = "/dropin/client/login";
const signOutUrl = "/dropin/client/logout";
const userUrl = "/dropin/client/user";

var console = new WeavyConsole("WeavyAuthentication");

/**
 * Weavy environment user
 * 
 * @typedef {object} WeavyUser
 * @property {number?} id - User id of the authenticated user. -1 means unauthorized.
 */

/**
 * Authentication handling for weavy environments.
 * 
 * @class
 * @extends WeavyEvents
 */
class WeavyAuthentication extends WeavyEvents {
  /**
   * Indicates if the authentication currently is updating the data from the environment.
   * @private
   * @type {boolean}
   */
  #isUpdating = false;

  /**
   * Indicates if the authentication is initialized.
   * @private
   * @type {boolean}
   */
  #isInitialized = false;

  /**
   * The weavy console logging.
   */
  get console() {
    return console;
  }

  /**
   * Indicates if the authentication is initialized.
   * @readonly
   * @type {boolean}
   */
  get isInitialized() {
    return this.#isInitialized === true;
  }

  /**
   * The url for authentication. Defaults to current location.
   * 
   * @private
   * @type {URL}
   */
  #url = new URL(window.location.origin + "/");

  /**
   * The url for the environment.
   * 
   * @readonly
   * @type {URL}
   */
  get url() {
    return this.#url;
  }

  /**
   * The current user.
   * 
   * @private
   * @type {WeavyUser?}
   */
  #user = null;

  /**
   * The currently authenticated user.
   * 
   * `null` is unauthenticated.
   * `id: -1`is authenticated but unauthorized.
   * 
   * @readonly
   * @type {WeavyUser}
   */
  get user() {
    return this.#user;
  }

  /**
   * Is the user established?
   * @private
   * @type {boolean?}
   */
  #isAuthenticated = null;

  /**
   * Indicates if the user is established.
   * 
   * @readonly
   * @type {boolean}
   */
  get isAuthenticated() {
    return this.#isAuthenticated === true;
  }

  /**
   * Indicates if a tokenFactory has been provided.
   * 
   * @readonly
   * @type {boolean}
   */
  get isProvided() {
    return !!this.#tokenFactory;
  }

  /**
   * Promise resolved when a user has been established.
   * @private
   * @type {WeavyPromise}
   */
  #whenAuthenticated = new WeavyPromise();

  /**
   * Async function resolved when a user has been established.
   * @async
   * @returns {Promise<WeavyUser>}
   */
  whenAuthenticated() {
    return this.#whenAuthenticated();
  }

  /**
   * Indicates if an authenticated user has authorized access.
   * 
   * @readonly
   * @type {boolean}
   */
  get isAuthorized() {
    return this.#checkAuthorized(this.#user);
  }

  /**
   * Promise resolved when an authenticated user has authorized access.
   * @private
   * @type {WeavyPromise}
   */
  #whenAuthorized = new WeavyPromise();

  /**
   * Async function resolved when an authenticated user has authorized access.
   * 
   * @async
   */
  whenAuthorized() {
    return this.#whenAuthorized();
  }

  /**
   * Promise resolved when the user has signed out.
   * 
   * @private
   * @type {WeavyPromise}
   */
  #whenSignedOut = new WeavyPromise();

  /**
   * Is the user currently signing out?
   * 
   * @private
   * @type {boolean}
   */
  #isSigningOut = false;

  // ACCESS TOKEN

  /**
   * The current access token
   * 
   * @private
   * @type {string?}
   */
  #accessToken;

  /**
   * The current async tokenFactory function
   * @private
   * @type {(refresh: boolean) => Promise<string>|null}
   */
  #tokenFactory;

  /**
   * Has any fresh token been requested?
   * @private
   * @type {boolean}
   */
  #isTokenRequested = false;

  /**
   * Promise resolved whenever a requested token has been produced. Keeps track of the current request.
   * @private
   * @type {WeavyPromise}
   */
  #whenTokenProduced = new WeavyPromise();

  /**
   * Creates a new instance for a specific environment URL. Instantiation is normally handled by {@link WeavyUrlClassManager}.
   * 
   * @param {URL|string} baseUrl - The url to the environment 
   */
  constructor(baseUrl) {
    super();

    console.debug("Create new weavy authentication", baseUrl);

    this.#url = new URL(baseUrl);

    // TODO: USE baseurl as selector
    WeavyPostal.on("authenticate", () => this.checkUserState());
  }

  /**
   * Checks if the provided user is signed in
   *
   * @param {WeavyUser?} user - User to check
   */
  #checkAuthorized(user) {
    if (user) {
      return (user.id && user.id !== -1) || false;
    }
    return false;
  }

  /**
   * Sets the async function for getting access tokens. 
   * Resets any current access token.
   *  
   * @param {(refresh: boolean) => Promise<string>} tokenFactory 
   */
  setTokenFactory(tokenFactory) {
    console.debug("Configuring token factory");
    this.#accessToken = null;
    this.#tokenFactory = tokenFactory;
    this.#isTokenRequested = false;
    this.#whenTokenProduced.reset();
  }

  /**
   * Returns the current access token; as a result from the supplied async function.
   * @param {boolean} [refresh=false] - Set to true if you want to call the host for a new token.
   * @returns {Promise<string>}
   */
  getAccessToken(refresh) {
    if (this.#whenTokenProduced.state() !== "pending") {
      if (refresh) {
        this.#whenTokenProduced.reset();
        this.#isTokenRequested = false;
      }
    }

    if (this.#isTokenRequested === false) {
      console.debug("Requesting new token");

      // Get new token from token factory
      this.#isTokenRequested = true;

      if (typeof this.#tokenFactory === "function") {
        // Provides the token factory with refresh=true when new token is needed.
        var resolvedProvider = this.#tokenFactory(refresh);

        if (typeof resolvedProvider.then === "function") {
          resolvedProvider.then(
            (token) => {
              if (typeof token === "string" && token) {
                this.#accessToken = token;
                this.#whenTokenProduced.resolve(this.#accessToken);
              } else {
                throw new Error(
                  "The async token factory should return a string token."
                );
              }
            },
            (reason) => {
              throw new Error(
                "Failed to get token from the async token factory:",
                reason
              );
            }
          );
        } else {
          throw new Error("The token factory is not an async function.");
        }
      } else {
        throw new Error(
          "The token factory should be an async function returning a string."
        );
      }
    }

    return this.#whenTokenProduced();
  }

  /**
   * Unsets the token factory and clears any current access token.
   */
  clearTokenFactory() {
    console.debug("clearing access token and token factory");
    this.#accessToken = null;
    this.#tokenFactory = null;
    this.#isTokenRequested = false;
    this.#whenTokenProduced.reset();
  }

  /**
   * Validates the user and access token.
   * 
   * @param {(refresh: boolean) => Promise<string>|undefined} tokenFactory - Any asyn tokenFactory function to assign before authenticating.
   * @returns Promise<WeavyUser>
   */
  init(tokenFactory) {
    if (
      this.#isAuthenticated === null ||
      (tokenFactory && tokenFactory !== this.#tokenFactory)
    ) {
      if (typeof tokenFactory === "function") {
        this.setTokenFactory(tokenFactory);
      }

      // Authenticate
      if (this.#tokenFactory !== undefined) {
        console.debug("authenticate using token factory");
        // If token factory is defined, it should always be processed
        this.#validateAccessToken();
      } else {
        // Check for current user state
        this.checkUserState();
      }
    }

    if (!this.#isInitialized) {
      this.#isInitialized = true;

      console.debug("initialized");
    }

    return this.#whenAuthenticated();
  }

  /**
   * Sets an environment user and checks authentication and authorization.
   * 
   * @private
   * @param {WeavyUser?} user 
   */
  #setUser(user) {
    if (user && user.id) {
      if (this.#user && user && this.#user.id !== user.id) {
        console.debug("setUser", user.id);
      }

      this.#user = user;
      this.#isAuthenticated = true;

      if (this.#checkAuthorized(user)) {
        this.#whenAuthorized.resolve();
      } else {
        // Authenticated but still awaiting authorization
        if (this.#whenAuthorized.state() !== "pending") {
          this.#whenAuthorized.reset();
        }
        this.#isSigningOut = false;
        this.#whenSignedOut.resolve();
      }

      this.#whenAuthenticated.resolve(user);
    } else {
      // No valid user, reset states
      this.#user = null;
      this.#isAuthenticated = false;

      this.#whenAuthorized.reset();
    }
  }

  // AUTHENTICATION

  /**
   * Sign in by validating any access token provided by the async tokenFactory function.
   * 
   * @async
   * @returns {Promise<WeavyUser>}
   */
  signIn() {
    if (this.#whenAuthenticated.state() !== "pending") {
      this.#whenAuthenticated.reset();
    }

    if (this.#whenAuthorized.state() !== "pending") {
      this.#whenAuthorized.reset();
    }

    this.#validateAccessToken();

    return this.#whenAuthenticated();
  }

  /**
   * Sign out the current user.
   *
   * @param {boolean} [clear] - Clears token factory after signOut
   * @async
   * @returns {Promise}
   */
  signOut(clear) {
    var authUrl = new URL(signOutUrl, this.url);
    this.#isSigningOut = true;

    if (clear) {
      this.clearTokenFactory();
    }

    this.triggerEvent("clear-user");

    window
      .fetch(authUrl.toString(), defaultFetchSettings)
      .catch(() => {
        console.warn("signOut request fail");
      })
      .finally(() => {
        console.debug("signout ajax -> processing user");
        this.#processUser({ id: -1 });
      });

    return this.#whenSignedOut();
  }

  /**
   * Checks if the current user state has changed.
   * 
   * @private
   * @param {WeavyUser} user
   * @emits WeavyAuthentication#user
   * @emits WeavyAuthentication#clear-user
   */
  #processUser(user) {
    // Default state when user is unauthenticated or has not changed
    var state = "updated";

    if (user && user.id) {
      if (this.#isAuthenticated) {
        if (this.#checkAuthorized(this.#user)) {
          // When signed in
          if (user && user.id === -1) {
            console.info("signed-out");
            // User signed out
            state = "signed-out";
          } else if (user && user.id !== this.#user.id) {
            console.info("changed-user");
            // User changed
            state = "changed-user";
          }
        } else {
          // When signed out
          if (user && user.id !== -1) {
            console.info("signed-in");

            // User signed in
            state = "signed-in";
          }
        }
      }

      this.#setUser(user);

      /**
       * Triggered when the user state has changed.
       * @event WeavyAuthentication#user
       * @type {Object}
       * @property {"updated"|"signed-out"|"changed-user"|"signed-in"|"user-error"} state - The state of the current user
       * @property {boolean} authorized - Indicates if the authenticated user has authorized access.
       * @property {WeavyUser} user - The current user.
       */
      this.triggerEvent("user", {
        state: state,
        authorized: this.#checkAuthorized(user),
        user: user,
      });
    } else {
      // No valid user state
      this.#setUser(null);

      /**
       * Triggered when no valid user state is established and the user needs to be cleared.
       * 
       * @event WeavyAuthentication#clear-user
       */
      this.triggerEvent("clear-user");
      this.triggerEvent("user", {
        state: "user-error",
        authorized: false,
        user: user,
      });
    }

    this.#isUpdating = false;
  }

  /**
   * Checks against the environment if the user state still is valid.
   * 
   * @async
   * @returns {Promise<WeavyUser>}
   */
  checkUserState() {
    if (!this.#isUpdating) {
      this.#isUpdating = true;

      console.debug(
        "checkUserState" +
          (this.#tokenFactory !== undefined ? ":token" : ":cookie")
      );

      if (this.#whenAuthenticated.state() !== "pending") {
        this.#whenAuthenticated.reset();
      }
      if (this.#whenAuthorized.state() !== "pending") {
        this.#whenAuthorized.reset();
      }

      var fetchUrl = new URL(userUrl, this.url);

      var fetchSettings = Object.assign({}, defaultFetchSettings);

      this.getAccessToken().then((token) => {
        if (typeof token !== "string") {
          return Promise.reject(new Error("Provided access token is invalid."));
        }

        fetchSettings.body = JSON.stringify({ access_token: token });

        window
          .fetch(fetchUrl, fetchSettings)
          .then((response) => {
            if (response.status === 401 && this.#tokenFactory !== undefined) {
              console.warn("access token validation failed, trying again");
              return this.getAccessToken(true).then((token) => {
                fetchSettings.body = JSON.stringify({ access_token: token });
                return window.fetch(fetchUrl, fetchSettings);
              });
            }
            return response;
          })
          .then(processJSONResponse)
          .then(
            (actualUser) => {
              console.debug("checkUserState fetch -> processing user");
              this.#processUser(actualUser);
            },
            () => {
              console.warn("checkUserState request fail");
              console.debug("checkUserState fetch fail -> processing user");
              this.#processUser({ id: null });
            }
          );
      });
    }

    return this.#whenAuthenticated();
  }

  /**
   * Validates the access token against the environment.
   * 
   * @private
   * @emits WeavyAuthentication#authentication-error
   * @returns {Promise<WeavyUser>}
   */
  #validateAccessToken() {
    var whenSSO = new WeavyPromise();
    var authUrl = new URL(ssoUrl, this.url);

    if (this.#isSigningOut) {
      // Wait for sign out to complete
      return this.#whenSignedOut.then(() => this.validateAccessToken());
    } else if (this.#whenSignedOut.state() !== "pending") {
      // Reset signed out promise
      this.#whenSignedOut.reset();
    }

    console.debug("validating access token");

    this.triggerEvent("signing-in");

    var fetchSettings = Object.assign({}, defaultFetchSettings);

    return this.getAccessToken().then((token) => {
      if (!token || typeof token !== "string") {
        return Promise.reject(new Error("Provided access token is invalid."));
      }

      fetchSettings.headers.Authorization = "Bearer " + token;

      // Convert url to string to avoid bugs in patched fetch (Dynamics 365)
      return window
        .fetch(authUrl.toString(), fetchSettings)
        .then((response) => {
          if (response.status === 401) {
            console.warn("access token validation failed, trying again");
            return this.getAccessToken(true).then((token) => {
              fetchSettings.headers.Authorization = "Bearer " + token;
              return window.fetch(authUrl.toString(), fetchSettings);
            });
          }
          return response;
        })
        .then(processJSONResponse)
        .then((ssoUser) => {
          this.#processUser(ssoUser);
          return whenSSO.resolve(ssoUser);
        })
        .catch((error) => {
          console.error("sign in with access token failed.", error.message);

          /**
           * Triggered when validation the access token fails.
           * @event WeavyAuthentication#authentication-error
           * @type {object}
           * @property {"access_token"} method - Which method that triggered the error.
           * @property {number} status - The HTTP status code.
           * @property {string} message - Any error message from the environment.
           */
          this.triggerEvent("authentication-error", {
            method: "access_token",
            status: 401,
            message: error.message,
          });
          this.#processUser({ id: null });
        });
    });
  }

  /**
   * Cleans up the instance.
   */
  destroy() {
    this.#isAuthenticated = null;
    this.#user = null;

    this.clearTokenFactory();

    this.clear();

    this.#isInitialized = false;
  }
}

export default new WeavyUrlClassManager(WeavyAuthentication);
