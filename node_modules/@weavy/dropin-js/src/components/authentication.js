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

class WeavyAuthentication extends WeavyEvents {
  #isUpdating = false;

  #isInitialized = false;
  get isInitialized() {
    return this.#isInitialized === true;
  }

  #url = new URL(window.location.origin + "/");
  get url() {
    return this.#url;
  }

  #user = null;
  get user() {
    return this.#user;
  }

  // Is the user established?
  #isAuthenticated = null;
  get isAuthenticated() {
    return this.#isAuthenticated === true;
  }

  get isProvided() {
    return !!this.#tokenFactory;
  }

  #whenAuthenticated = new WeavyPromise();
  whenAuthenticated() {
    return this.#whenAuthenticated();
  }

  get isAuthorized() {
    return this.#checkAuthorized(this.#user);
  }

  #whenAuthorized = new WeavyPromise();
  whenAuthorized() {
    return this.#whenAuthorized();
  }

  #whenSignedOut = new WeavyPromise();
  #isSigningOut = false;

  // ACCESS TOKEN
  #accessToken;
  #tokenFactory;

  #isTokenRequested = false;
  #whenTokenProduced = new WeavyPromise();

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
   * @param {any} user - User to check
   */
  #checkAuthorized(user) {
    if (user) {
      return (user.id && user.id !== -1) || false;
    }
    return false;
  }

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
   * @returns {Promise}
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

  clearTokenFactory() {
    console.debug("clearing access token and token factory");
    this.#accessToken = null;
    this.#tokenFactory = null;
    this.#isTokenRequested = false;
    this.#whenTokenProduced.reset();
  }

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
   * Sign in using Single Sign On access token.
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
      this.triggerEvent("user", {
        state: state,
        authorized: this.#checkAuthorized(user),
        user: user,
      });
    } else {
      // No valid user state
      this.#setUser(null);

      this.triggerEvent("clear-user");
      this.triggerEvent("user", {
        state: "user-error",
        authorized: false,
        user: user,
      });
    }

    this.#isUpdating = false;
  }

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
          this.triggerEvent("authentication-error", {
            method: "access_token",
            status: 401,
            message: error.message,
          });
          this.#processUser({ id: null });
        });
    });
  }

  destroy() {
    this.#isAuthenticated = null;
    this.#user = null;

    this.clearTokenFactory();

    this.clear();

    this.#isInitialized = false;
  }
}

export default new WeavyUrlClassManager(WeavyAuthentication);
