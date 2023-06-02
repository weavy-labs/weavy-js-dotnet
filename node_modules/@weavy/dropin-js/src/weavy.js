/* global WEAVY_VERSION, WEAVY_DEVELOPMENT */

import WeavyEnvironments from "./components/environment";
import WeavyPromise from "./utils/promise";
import WeavyConsole from "./utils/console";

const console = new WeavyConsole("Weavy");
console.info("weavy.js", WEAVY_DEVELOPMENT ? "dev" : "");

// WEAVY

/**
 * Main options for Weavy. The `url` and `tokenFactory` option is required.
 * When weavy initializes, it connects to the server and processes the options as well as using them internally.
 *
 * @see [Client Options]{@link https://docs.weavy.com/client/development/options}
 * @typedef WeavyOptions
 * @type {Object}
 * @property {string} [className] - Additional classNames added to weavy.
 * @property {string} [css] - Custom CSS styles applied in all apps.
 * @property {string} [id] - An id for the instance. A unique id is always generated.
 * @property {function} tokenFactory - The async function returning a string access token passed to {@link WeavyAuthentication}.
 * @property {string} [lang] - [Language code]{@link https://en.wikipedia.org/wiki/ISO_639-1} of preferred user interface language, e.g. <code>en</code> for English. When set, it must match one of your [configured languages]{@link https://docs.weavy.com/server/localization}.
 * @property {boolean} [shadowMode=closed] - Set whether ShadowRoots should be `closed` or `open` (not recommended).
 * @property {string} [tz] - Timezone identifier, e.g. <code>Pacific Standard Time</code>. When specified, this setting overrides the timezone setting on a user´s profile. The list of valid timezone identifiers can depend on the version and operating system of your Weavy server.
 * @property {string} [url] - The URL of the Weavy-installation to connect to. Defaults to the installation where the script came from.
 */

/**
 * General class for setting the environment configuration for Weavy apps. Also handles default options for any created.
 * You need to at least configure the `url` to your weavy environment and define a `tokenFactory` that provides access tokens via your server when requested.
 * 
 * Exports an instance by default.
 * 
 * Can be initialized as a custom component using `<weavy-environment url="https://www.example.test" token-factory="async () => '{ACCESS_TOKEN}'" />`
 * 
 * If you want to connect to a specific server use the [url option]{@link Weavy#options}.
 *
 * @example
 * Weavy.url = "https://www.example.test";
 * Weavy.tokenFactory = async () => "{ACCESS_TOKEN}"
 *
 * @class Weavy
 * @extends {HTMLElement}
 * @classdesc The static core class for configuring the Weavy environment.
 */

class Weavy extends HTMLElement {
  /**
   * Default options for apps. These options are general for all instantiated Weavy apps.
   * You may add any general options you like here.
   *
   * @example
   * // Defaults
   * Weavy.defaults = {
   *     css: "",
   *     className: "",
   * };
   *
   * @type {WeavyApp~options}
   * @name Weavy.defaults
   */
  defaults = {
    shadowMode: "closed",
    filebrowser: "https://filebrowser.weavy.io/v14/",
  };

  /**
   * The version of Weavy.
   * @type {string}
   */
  get version() {
    return WEAVY_VERSION;
  }

  /**
   * @private
   * @type {WeavyEnvironments~ClassType}
   */
  #environment;

  /**
   * The environment instance.
   * 
   * @readonly
   * @type {WeavyEnvironments~ClassType}
   */
  get environment() {
    if (!this.#environment) {
      throw new Error("No URL is defined for the environment. Please point Weavy.url to your environment.")
    }
    return this.#environment;
  }

  /**
   * The url of the weavy server.
   *
   * @type {URL} Weavy#url
   **/
  get url() {
    return this.#environment?.url;
  }

  set url(url) {
    this.setAttribute('url', url)
  }

  /**
   * @private
   * @async
   * @function
   * @returns {string}
   */
  #tokenFactory;


  /**
   * Async function returning an access token for user authentication.
   * 
   * @async
   * @function
   * @returns {string}
   */
  get tokenFactory() {
    return this.environment?.options.tokenFactory || this.#tokenFactory;
  }

  set tokenFactory(tokenFactory) {
    this.#tokenFactory = tokenFactory;

    if (this.#environment) {
      this.#environment.configure({ tokenFactory })
    }
  }

  /**
   * @private
   * @type {string}
   */
  #tz;


  /**
   * Timezone identifier, e.g. <code>Pacific Standard Time</code>. When specified, this setting overrides the timezone setting on a user's profile. The list of valid timezone identifiers can depend on the version and operating system of your Weavy server.
   * @type {string}
   */
  get tz() {
    return this.#environment?.options.tz || this.#tz;
  }

  set tz(tz) {
    if (tz) {
      this.setAttribute('tz', tz);
    } else {
      this.removeAttribute('tz');
    }
  }

  /**
   * @private
   * @type {string}
   */
  #lang;

  /**
   * [Language code]{@link https://en.wikipedia.org/wiki/ISO_639-1} of preferred user interface language, e.g. <code>en</code> for English. When set, it must match one of your environment configured languages.
   * @type {string}
   */
  get lang() {
    return this.#environment?.options.lang || this.#lang;
  }

  set lang(lang) {
    if (lang) {
      this.setAttribute('lang', lang);
    } else {
      this.removeAttribute('lang')
    }
  }

  /**
   * @private
   * @type {WeavyPromise}
   */
  #whenReady = new WeavyPromise();

  /**
   * Async function resolved when the environment is configured with an `url`.
   * 
   * @async
   * @function 
   */
  async whenReady() {
    return await this.#whenReady();
  }

  /**
   * Method for fetching data from the Web API. Automatically handles all authentication and CORS settings.
   * @async 
   * @type {typeof WeavyEnvironment.fetch}
   */
  get fetch() {
    if (!this.#environment) {
      throw new Error("fetch: No URL is defined for the environment. Please point Weavy.url to your environment.")
    }
    return this.environment?.fetch;
  }

  static get observedAttributes() {
    return ['url', 'token-factory', 'tz','lang', 'class'];
  }

  attributeChangedCallback(name, oldValue, newValue) {
    if (name === 'url') {
      this.#environment = WeavyEnvironments.get(newValue);
      this.#environment.configure({ 
        defaults: this.defaults,
        tokenFactory: this.tokenFactory,
        tz: this.tz,
        lang: this.lang
      });
      this.#whenReady.resolve()
    } else if (name === 'tz') {
      this.#tz = newValue;
      if (this.#environment) {
        this.#environment.configure({ tz: newValue });
      }
    } else if (name === 'lang') {
      this.#lang = newValue;
      if (this.#environment) {
        this.#environment.configure({ lang: newValue });
      }
    } else if (name === 'token-factory') {
      this.#tokenFactory = eval?.(`"use strict";(${newValue})`);
      if (this.#environment) {
        this.#environment.configure({ tokenFactory: this.#tokenFactory });
      }
    } else if (name === 'class') {
      this.defaults.className = newValue;
    }
  }

  constructor(){
    super()
  }

  connectedCallback() {
    this.getAttributeNames().forEach((attr) => {
      this.attributeChangedCallback(attr, null, this.getAttribute(attr))
    })
  }
}

customElements.define("weavy-environment", Weavy);

const StaticWeavy = new Weavy();
export default StaticWeavy;
