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
 * All options are optional.
 *
 * If you want to connect to a specific server use the [url option]{@link Weavy#options}.
 *
 * @example
 * var weavy = new Weavy();
 *
 * var coreDevWeavy = new Weavy({ url: "http://myweavysite.dev" });
 *
 * @class Weavy
 * @classdesc The core class for the Weavy client.
 */

class Weavy extends HTMLElement {
  /**
   * Default options. These options are general for all Weavy instances and may be overridden in {@link Weavy#options}.
   * You may add any general options you like here.
   *
   * @example
   * // Defaults
   * Weavy.defaults = {
   *     css: "",
   *     className: "",
   * };
   *
   * // Set a general url to connect all weavy instances to
   * Weavy.defaults.url = "https://myweavysite.com";
   * var weavy = new Weavy();
   *
   * @type {Object}
   * @name Weavy.defaults
   * @property {string} [className] - Additional classNames added to weavy.
   * @property {boolean} [shadowMode=closed] - Set whether ShadowDOMs should be `closed` (recommended) or `open`.
   */
  defaults = {
    shadowMode: "closed",
    filebrowser: "https://filebrowser.weavy.io/v14/",
  };

  /**
   * The version of Weavy.
   * @name Weavy.version
   * @type {string}
   */
  get version() {
    return WEAVY_VERSION;
  }

  #environment;

  get environment() {
    if (!this.#environment) {
      throw new Error("No URL is defined for the environment. Please point Weavy.url to your environment.")
    }
    return this.#environment;
  }

  /**
   * The url of the weavy server.
   *
   * @member {URL} Weavy#url
   **/
  get url() {
    return this.#environment?.url;
  }

  set url(url) {
    this.setAttribute('url', url)
  }

  #tokenFactory;

  get tokenFactory() {
    return this.environment?.options.tokenFactory || this.#tokenFactory;
  }

  set tokenFactory(tokenFactory) {
    this.#tokenFactory = tokenFactory;

    if (this.#environment) {
      this.#environment.configure({ tokenFactory })
    }
  }

  #tz;

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

  #lang;

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

  #whenReady = new WeavyPromise();

  whenReady() {
    return this.#whenReady();
  }

  get fetch() {
    if (!this.#environment) {
      throw new Error("No URL is defined for the environment. Please point Weavy.url to your environment.")
    }
    return this.environment?.fetch;
  }

  static get observedAttributes() {
    return ['url', 'token-factory', 'tz','lang', 'class'];
  }

  attributeChangedCallback(name, oldValue, newValue) {
    if (name === 'url') {
      this.#environment = WeavyEnvironments.get(newValue);
      this.#environment.configure(Object.assign({}, this));
      this.#whenReady.resolve()
    } else if (name === 'tz') {
      this.#tz = newValue;
      if (this.#environment) {
        this.#environment.configure({ tz: newValue });
      }
    } else if (name === 'lang') {
      this.#lang = newValue;
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

    this.getAttributeNames().forEach((attr) => {
        this.attributeChangedCallback(attr, null, this.getAttribute(attr))
    })
  }
}
customElements.define("weavy-environment", Weavy);

const StaticWeavy = new Weavy();
export default StaticWeavy;
