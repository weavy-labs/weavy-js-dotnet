import { processJSONResponse } from './utils/utils';
import WeavyPromise from './utils/promise';
import WeavyConsole from './utils/console';
import WeavyEvents from './utils/events';

const ssoUrl = "/dropin/client/login";
const signOutUrl = "/dropin/client/logout";
const userUrl = "/dropin/client/user";

const _authentications = new Map();

const defaultFetchSettings = {
  method: "POST",
  mode: 'cors', // no-cors, *cors, same-origin
  cache: 'reload', // *default, no-cache, reload, force-cache, only-if-cached
  credentials: 'include', // include, *same-origin, omit
  headers: {
    'Content-Type': 'application/json',
    // https://stackoverflow.com/questions/8163703/cross-domain-ajax-doesnt-send-x-requested-with-header
    "X-Requested-With": "XMLHttpRequest"
  },
  redirect: 'manual', // manual, *follow, error
  referrerPolicy: "no-referrer-when-downgrade", // no-referrer, *no-referrer-when-downgrade, origin, origin-when-cross-origin, same-origin, strict-origin, strict-origin-when-cross-origin, unsafe-url
};

// MULTI AUTHENTICATION HANDLING
class WeavyAuthenticationsManager {
  static getAuthentication(url) {
    var sameOrigin = false;

    url = url && String(url);

    var urlExtract = url && /^(https?:\/(\/[^/]+)+)\/?$/.exec(url)
    if (urlExtract) {
      sameOrigin = window.location.origin === urlExtract[1];
      url = urlExtract[1];
    }
    url = (sameOrigin ? "" : url) || "";
    if (_authentications.has(url)) {
      return _authentications.get(url);
    } else {
      var authentication = new WeavyAuthentication(url);
      _authentications.set(url, authentication);
      return authentication;
    }
  }

  static removeAuthentication(url) {
    url = url && String(url) || "";
    try {
      var authentication = _authentications.get(url);
      if (authentication && authentication.destroy) {
        authentication.destroy();
      }
      _authentications.delete(url);
    } catch (e) {
      console.error("Could not remove authentication", url, e);
    }
  }
}

class WeavyAuthentication {

  constructor(baseUrl) {
    var _initialized = false;

    var console = new WeavyConsole("WeavyAuthentication");

    console.debug("Create new weavy authentication", baseUrl);

    // TODO: Use new Url()
    baseUrl = baseUrl && String(baseUrl) || window.location.origin + "/";

    if (baseUrl) {
      // Remove trailing slash
      baseUrl = /\/$/.test(baseUrl) ? baseUrl.slice(0, -1) : baseUrl;
    }

    var events = new WeavyEvents(this);
    this.on = events.on;
    this.one = events.one;
    this.off = events.off;

    var _user = null;

    // Is the user established?
    var _isAuthenticated = null;
    var _whenAuthenticated = new WeavyPromise();
    var _whenAuthorized = new WeavyPromise();

    var _isUpdating = false;

    var _whenSignedOut = new WeavyPromise();
    var _isSigningOut = false;

    /**
     * Checks if the provided or authenticated user is signed in
     * 
     * @param {any} [user] - Optional user to check
     */
    function isAuthorized(user) {
      if (user) {
        return user.id && user.id !== -1 || false;
      }
      return _user && _user.id && _user.id !== -1 || false;
    }

    // ACCESS TOKEN
    var _accessToken;
    var _tokenFactory;
    
    var _isTokenRequested = false;
    var _whenTokenProduced = new WeavyPromise();

    function setTokenFactory(tokenFactory) {
      console.debug("Configuring token factory");
      _accessToken = null;
      _tokenFactory = tokenFactory;
      _isTokenRequested = false;
      _whenTokenProduced.reset();
    }


    /**
     * Returns the current access token; as a result from the supplied async function.
     * @param {boolean} [refresh=false] - Set to true if you want to call the host for a new token.
     * @returns {Promise}
     */
    function getAccessToken(refresh) {
      if (_whenTokenProduced.state() !== "pending") {
        if (refresh) {
          _whenTokenProduced.reset();
          _isTokenRequested = false;
        }
      }

      if (_isTokenRequested === false) {
        console.debug("Requesting new token");

        // Get new token from token factory
        _isTokenRequested = true;

        if (typeof _tokenFactory === "function") {

          // Provides the token factory with refresh=true when new token is needed.
          var resolvedProvider = _tokenFactory(refresh);

          if (typeof resolvedProvider.then === "function") {
            resolvedProvider.then(function (token) {
              if (typeof token === "string" && token) {
                _accessToken = token;
                _whenTokenProduced.resolve(_accessToken);
              } else {
                _whenTokenProduced.reject("The async token factory should return a string token.");
              }
            }, function (reason) {
              _whenTokenProduced.reject("Failed to get token from the async token factory:", reason);
            });
          } else {
            _whenTokenProduced.reject("The token factory is not an async function.");
          }
        } else {
          _whenTokenProduced.reject("The token factory should be an async function returning a string.");
        }

      }

      return _whenTokenProduced();
    }

    function clearTokenFactory() {
      console.debug("clearing access token and token factory");
      _accessToken = null;
      _tokenFactory = null;
      _isTokenRequested = false;
      _whenTokenProduced.reset();
    }

    function init(tokenFactory) {
      if (_isAuthenticated === null || tokenFactory && tokenFactory !== _tokenFactory) {
        if (typeof tokenFactory === "function") {
          setTokenFactory(tokenFactory);
        }

        // Authenticate
        if (_tokenFactory !== undefined) {
          console.debug("authenticate using token factory")
          // If token factory is defined, it should always be processed
          validateAccessToken();
        } else {
          // Check for current user state
          checkUserState("init()");
        }
      }

      if (!_initialized) {
        _initialized = true;

        console.debug("initialized");
      }

      return _whenAuthenticated();
    }

    function setUser(user, originSource) {
      if (user && user.id) {
        if (_user && user && _user.id !== user.id) {
          console.debug("setUser", user.id, originSource);
        }

        _user = user;
        _isAuthenticated = true;

        if (isAuthorized(user)) {
          _whenAuthorized.resolve();
        } else {
          // Authenticated but still awaiting auhorization
          if (_whenAuthorized.state() !== "pending") {
            _whenAuthorized.reset();
          }
          _isSigningOut = false;
          _whenSignedOut.resolve();
        }

        _whenAuthenticated.resolve(user);
      } else {
        // No valid user, reset states
        _user = null;
        _isAuthenticated = false;

        _whenAuthorized.reset();
      }
    }

    // AUTHENTICATION

    /**
     * Sign in using Single Sign On access token. 
     */
    function signIn() {
      if (_whenAuthenticated.state() !== "pending") {
        _whenAuthenticated.reset();
      }

      if (_whenAuthorized.state() !== "pending") {
        _whenAuthorized.reset();
      }

      validateAccessToken();

      return _whenAuthenticated();
    }

    /**
     * Sign out the current user.
     * 
     * @param {boolean} [clear] - Clears token factory after signOut
     */
    function signOut(clear) {
      var authUrl = new URL(signOutUrl, baseUrl);
      _isSigningOut = true;

      if (clear) {
        clearTokenFactory();
      }

      events.triggerEvent("clear-user");

      window.fetch(authUrl.toString(), defaultFetchSettings).catch(function () {
        console.warn("signOut request fail");
      }).finally(function () {
        console.debug("signout ajax -> processing user");
        processUser({ id: -1 }, "signOut()");
      });

      return _whenSignedOut();
    }

    function processUser(user, originSource) {
      // Default state when user is unauthenticated or has not changed
      var state = "updated";

      if (user && user.id) {
        if (_isAuthenticated) {
          if (isAuthorized()) {
            // When signed in
            if (user && user.id === -1) {
              console.info("signed-out");
              // User signed out
              state = "signed-out";
            } else if (user && user.id !== _user.id) {
              console.info("changed-user");
              // User changed
              state = "changed-user";
            }
          } else {
            // When signed out
            if (user && user.id !== -1) {
              console.info("signed-in", originSource);

              // User signed in
              state = "signed-in";
            }
          }
        }

        setUser(user, originSource || "processUser()");
        events.triggerEvent("user", { state: state, authorized: isAuthorized(user), user: user });
      } else {
        // No valid user state
        setUser(null, originSource || "processUser()");

        events.triggerEvent("clear-user");
        events.triggerEvent("user", { state: "user-error", authorized: false, user: user });
      }

      _isUpdating = false;
    }


    function checkUserState(originSource) {
      if (!_isUpdating) {
        _isUpdating = true;
        
        console.debug("checkUserState" + (_tokenFactory !== undefined ? ":token" : ":cookie"), originSource);

        if (_whenAuthenticated.state() !== "pending") {
          _whenAuthenticated.reset();
        }
        if (_whenAuthorized.state() !== "pending") {
          _whenAuthorized.reset();
        }

        var url = new URL(userUrl, baseUrl);

        var fetchSettings = Object.assign({}, defaultFetchSettings);

        getAccessToken().then(function (token) {
          if (typeof token !== "string") {
            return Promise.reject(new Error("Provided access token is invalid."))
          }

          fetchSettings.body = JSON.stringify({ access_token: token });

          window.fetch(url.toString(), fetchSettings).then(function (response) {
            if (response.status === 401 && _tokenFactory !== undefined) {
              console.warn("access token validation failed, trying again");
              return getAccessToken(true).then(function (token) {
                fetchSettings.body = JSON.stringify({ access_token: token });
                return window.fetch(url.toString(), fetchSettings);
              })
            }
            return response;
          }).then(processJSONResponse).then(function (actualUser) {
            console.debug("checkUserState fetch -> processing user")
            processUser(actualUser, "checkUserState," + originSource);
          }, function () {
            console.warn("checkUserState request fail");
            console.debug("checkUserState fetch fail -> processing user");
            processUser({ id: null }, "checkUserState," + originSource);
          });
        });

      }

      return _whenAuthenticated();
    }

    function validateAccessToken() {
      var whenSSO = new WeavyPromise();
      var authUrl = new URL(ssoUrl, baseUrl);

      if (_isSigningOut) {
        // Wait for signout to complete
        return _whenSignedOut.then(function () { return validateAccessToken(); });
      } else if (_whenSignedOut.state() !== "pending") {
        // Reset signed out promise
        _whenSignedOut.reset();
      }

      console.debug("validating access token");

      events.triggerEvent("signing-in");

      var fetchSettings = Object.assign({}, defaultFetchSettings);

      return getAccessToken().then(function (token) {
        if (!token || typeof token !== "string") {
          return Promise.reject(new Error("Provided access token is invalid."))
        }

        fetchSettings.headers.Authorization = "Bearer " + token;

        // Convert url to string to avoid bugs in patched fetch (Dynamics 365)
        return window.fetch(authUrl.toString(), fetchSettings).then(function (response) {
          if (response.status === 401) {
            console.warn("access token validation failed, trying again");
            return getAccessToken(true).then(function (token) {
              fetchSettings.headers.Authorization = "Bearer " + token;
              return window.fetch(authUrl.toString(), fetchSettings);
            })
          }
          return response;

        }).then(processJSONResponse).then(function (ssoUser) {
          processUser(ssoUser);
          return whenSSO.resolve(ssoUser);
        }).catch(function (error) {
          console.error("sign in with access token failed.", error.message);
          events.triggerEvent("authentication-error", { method: "access_token", status: 401, message: error.message });
          processUser({ id: null });
        });
      })
    }

    function destroy() {
      _isAuthenticated = null;
      _user = null;

      clearTokenFactory();

      events.clear();

      _initialized = false;
    }

    // Exports 
    this.init = init;
    this.isAuthorized = isAuthorized;
    this.isAuthenticated = function () { return _isAuthenticated === true; };
    this.isInitialized = function () { return _initialized === true; }
    this.isProvided = function () { return !!_tokenFactory; };
    this.whenAuthenticated = function () { return _whenAuthenticated(); };
    this.whenAuthorized = function () { return _whenAuthorized(); };
    this.signIn = signIn;
    this.signOut = signOut;
    this.setTokenFactory = setTokenFactory;
    this.getAccessToken = getAccessToken;
    this.clearTokenFactory = clearTokenFactory;
    this.checkUserState = checkUserState;
    this.user = function () { return _user };
    this.destroy = destroy;
  }

}

export default WeavyAuthenticationsManager;
