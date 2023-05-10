/**
 * Multi site manager for handling instances of a given Class tied to a unique URL.
 */
export default class WeavyUrlClassManager {
  #SiteClass;
  #sites;

  /**
   *
   * @param {Class} CreateClass The Class that should be instantiated for each unique url.
   */
  constructor(CreateClass) {
    this.#SiteClass = CreateClass;
    this.#sites = new Map();
  }

  /**
   * Creates a new instance of a predefined Class for each unique URL.
   * Returns existing instances for existing URLs.
   *
   * @param {URL|string} url - The URL to get a new or existing instance for.
   * @returns {any}
   */
  get(url) {
    var sameOrigin = false;

    url = url && String(url);

    var urlExtract = url && /^(https?:\/(\/[^/]+)+)\/?$/.exec(url);
    if (urlExtract) {
      sameOrigin = window.location.origin === urlExtract[1];
      url = urlExtract[1];
    }
    url = (sameOrigin ? "" : url) || "";
    if (this.#sites.has(url)) {
      return this.#sites.get(url);
    } else {
      var siteInstance = new this.#SiteClass(url);
      this.#sites.set(url, siteInstance);
      return siteInstance;
    }
  }

  /**
   * Removes an url and instance. If the instance has a destroy method it will be executed first.
   *
   * @param {URL|string} url - The url of the instance to remove
   */
  remove(url) {
    url = (url && String(url)) || "";
    try {
      var siteInstance = this.#sites.get(url);
      if (siteInstance && typeof siteInstance.destroy === "function") {
        siteInstance.destroy();
      }
      this.#sites.delete(url);
    } catch (e) {
      console.error("Could not remove instance", url, e);
    }
  }
}
