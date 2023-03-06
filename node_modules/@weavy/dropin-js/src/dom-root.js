import { asElement } from './utils/utils';
import customElementsCss from "./scss/_custom-elements.scss";
import WeavyStyles, { createStyleSheet } from "./styles";

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
class WeavyRoot {
  /**
   * Is ShadowDOM supported by the browser?
   * @memberof WeavyRoot.
   * @static
   * @type {boolean}
   */
  static supportsShadowDOM = !!HTMLElement.prototype.attachShadow;

  /**
   * The stylesheet available in the global scope.
   * @memberof WeavyRoot.
   * @static 
   * @type {CSSStyleSheet|StyleElement}
   */
  static globalStyleSheet;

  /**
   * The id of the root.
   * @type {string}
   */
  id;

  /**
   * The id without any weavy prefix
   * @private
   * @type {string}
   */
  #rawId;

  /**
   * The parent DOM node where the root is attached.
   * @type {Element} 
   */
  parent;

  /**
   * The &lt;weavy/&gt; node which is the placeholder for the root. Attached to the parent.
   * @type {Element}
   */
  section;

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

  static registerCustomElements() {
    if (!WeavyRoot.globalStyleSheet) {
      /**
       * Three custom elements are used <weavy>, <weavy-root> and <weavy-container>
       * <weavy> can't be defined and acts only as a DOM placeholder.
       **/
      if ('customElements' in window) {
        try {
          window.customElements.define('weavy-root', HTMLElement.prototype);
          window.customElements.define('weavy-container', HTMLElement.prototype);
        } catch (e) { /* well, the browser didn't like it, no worries */ }
      }
    
      WeavyRoot.globalStyleSheet = createStyleSheet(document, customElementsCss);
    }
  }

  /**
   * Creates a sealed shadow DOM and injects additional styles into the created root.
   * @param {Weavy} weavy - Weavy instance
   * @param {Element} parent - The parent DOM node where the root should be attached. 
   * @param {string} id - The id of the root.
   * @param {*} [eventParent] - Optional parent to bubble events to.
   */
  constructor(weavy, parent, id, eventParent) {
    this.#rawId = weavy.removeId(id);
    this.id = weavy.getId(id);
    this.parent = asElement(parent);

    if (!this.parent) {
      throw new Error("No parent container defined" + this.id);
    }

    // Events
    this.eventParent = eventParent;
    this.on = weavy.events.on.bind(this);
    this.one = weavy.events.one.bind(this);
    this.off = weavy.events.off.bind(this);
    this.triggerEvent = weavy.events.triggerEvent.bind(this);

    WeavyRoot.registerCustomElements();

    this.section = document.createElement("weavy");

    this.section.id = this.id;

    this.root = document.createElement("weavy-root");
    this.root.setAttribute("data-version", weavy.version);

    this.container = document.createElement("weavy-container");
    this.container.className = "wy-container";
    this.container.id = weavy.getId("container-" + this.#rawId);
  
    var _className = '';

    Object.defineProperty(this, "className", {
      get: function () { return _className },
      set: function (className) {
        _className = className;
        this.updateClassName();
      }
    })

    this.updateClassName = function updateClassName() {
      this.container.className = ["wy-container", weavy.className, this.className].filter((x) => x).join(" ");
    };

    this.triggerEvent("before:root-create", this);

    this.parent.appendChild(this.section);
    this.section.appendChild(this.root);

    if (WeavyRoot.supportsShadowDOM) {
      if (weavy.options.shadowMode === "open") {
        weavy.warn(this.id, "Using ShadowDOM in open mode", this.id);
      }
      this.dom = this.root.attachShadow({ mode: weavy.options.shadowMode || "closed" });
    } else {
      this.dom = this.root;
    }
    this.dom.appendChild(this.container);

    this.styles = new WeavyStyles(weavy, this, this);

    this.updateClassName();
    weavy.on("update-class-name", this.updateClassName.bind(this));

    /**
     * Triggered when a shadow root is created
     * 
     * @event WeavyRoot#root-create
     * @returns {WeavyRoot}
     **/
    this.triggerEvent("on:root-create", this);

    queueMicrotask(() => this.triggerEvent("after:root-create", this));
  }

  remove() {
    this.triggerEvent("before:root-remove", this);

    if (this.section) {
      this.section.remove();
      this.section = null;
    }

    this.triggerEvent("on:root-remove", this);
    this.triggerEvent("after:root-remove", this);
  }
}

export default WeavyRoot;