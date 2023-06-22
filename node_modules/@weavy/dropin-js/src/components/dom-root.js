import domRootCss from "../scss/_dom-root.scss";
import customElementsCss from "../scss/_custom-elements.scss";

import WeavyConsole from '../utils/console';
import WeavyEvents from '../utils/events';
import { createStyleSheet, applyStyleSheet } from "./styles";

const console = new WeavyConsole("DOM root")

/**
 * @class WeavyRoot

 * @classdesc
 * Weavy shadow root to enable closed scopes in the DOM that also can be managed and removed.
 * The shadow root will isolate styles and nodes within the root.
 * 
 * @structure
 * {parent} ➜ &lt;weavy/&gt; ➜ {root} ➜ {ShadowDOM} ➜ {container}
 * 
 * You may define styles by either setting weavy options or by injecting them via {@link WeavyRoot#setStyles}
 * 
 * @see {@link https://developer.mozilla.org/en-US/docs/Web/Web_Components/Using_shadow_DOM}
 * @property {string} id - The id of the root.
 * @property {Element} parent - The parent DOM node where the root is attached.
 * @property {Element} section - The &lt;weavy/&gt; node which is the placeholder for the root. Attached to the parent.
 * @property {Element} root - The the &lt;weavy-root/&gt; that acts as root. May contain a ShadowDOM if supported.
 * @property {ShadowDOM|Element} dom - The ShadowDOM if supported, otherwise the same as root. The ShadowDOM is closed by default.
 * @property {Element} container - The &lt;weavy-container/&gt; where you safely can place elements. Attached to the dom.
 * @example
 * ```html
 * <style>
 *   .wy-container {
 *    // The .wy- selector will be recognized by weavy and the stylesheet will inserted into all weavy roots
 *    ...
 *   }
 * </style>
 * ```
 */
export default class WeavyRoot extends WeavyEvents {

  static defaults = {
    shadowMode: "closed"
  }

  /**
   * Is ShadowDOM supported by the browser?
   * @memberof WeavyRoot.
   * @static
   * @type {boolean}
   */
  static supportsShadowDOM = !!HTMLElement.prototype.attachShadow;

  /**
   * The common stylesheet for each root.
   * @private
   * @type {CSSStyleSheet|StyleElement}
   */
  #commonStyleSheet;

  /**
   * The stylesheet available in the global scope.
   * @memberof WeavyRoot.
   * @static 
   * @type {CSSStyleSheet|StyleElement}
   */
  static globalStyleSheet;

  /**
   * The weavy console logging.
   */
  get console() {
    return console;
  }

  /**
   * The the &lt;weavy-root/&gt; that acts as root. May contain a ShadowDOM if supported.
   * @type {Element}
   */
  root;

  /**
   * The ShadowDOM if supported, otherwise the same as root. The ShadowDOM is closed by default.
   * @type {ShadowDOM|Element}
   */
  dom;

  /**
   * The &lt;weavy-container/&gt; where you safely can place elements. Attached to the dom.
   * @type {Element}
   */
  container;

  #className = '';

  get className() { return this.#className }
  
  set className(className) {
      this.#className = className;
      this.updateClassName();
  }

  static registerCustomElements() {
    if (!WeavyRoot.globalStyleSheet) {
      /**
       * Three custom elements are used <weavy>, <weavy-root> and <weavy-container>
       * <weavy> can't be defined and acts only as a DOM placeholder.
       **/
      if ('customElements' in window) {
        try {
          window.customElements.define('weavy-root', HTMLElement.prototype);
          window.customElements.define('weavy-container', HTMLDivElement.prototype);
        } catch (e) { /* well, the browser didn't like it, no worries */ }
      }
    
      WeavyRoot.globalStyleSheet = createStyleSheet(customElementsCss);
      applyStyleSheet(document, WeavyRoot.globalStyleSheet);
    }
  }

  /**
   * Creates a sealed shadow DOM and injects additional styles into the created root.
   * @param {Weavy} weavy - Weavy instance
   * @param {Element} parent - The parent DOM node where the root should be attached. 
   * @param {string} id - The id of the root.
   * @param {*} [eventParent] - Optional parent to bubble events to.
   */
  constructor(eventParent) {
    super()

    // Events
    if (eventParent) {
      this.eventParent = eventParent;
    }

    WeavyRoot.registerCustomElements();

    this.root = document.createElement("weavy-root");

    this.container = document.createElement("weavy-container");
    this.container.className = "wy-container";

    this.triggerEvent("before:root-create", this);

    if (WeavyRoot.defaults.shadowMode === "open") {
      console.warn(this.id, "Using ShadowDOM in open mode", this.id);
    }
    this.dom = this.root.attachShadow({ mode: WeavyRoot.defaults.shadowMode || "closed" });
    
    this.dom.appendChild(this.container);

    this.updateClassName();

    this.#commonStyleSheet = createStyleSheet(domRootCss);
    applyStyleSheet(this.dom, this.#commonStyleSheet)

    /**
     * Triggered when a shadow root is created
     * 
     * @event WeavyRoot#root-create
     * @returns {WeavyRoot}
     **/
    this.triggerEvent("on:root-create", this);

    queueMicrotask(() => this.triggerEvent("after:root-create", this));
  }
  
  updateClassName() {
    if (this.container) {
      this.container.className = ["wy-container", this.#className].filter((x) => x).join(" ");
    }
  }

  remove() {
    this.triggerEvent("before:root-remove", this);

    if (this.root) {
      this.root.remove();
      this.root = null;
    }

    this.triggerEvent("on:root-remove", this);
    this.triggerEvent("after:root-remove", this);
  }
}