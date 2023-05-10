/**
 * Parse any HTML string into a HTMLCollection. Use parseHTML(html)[0] to get the first HTMLElement.
 *
 * @param {any} html
 * @returns {HTMLCollection} List of all parsed HTMLElements
 */
export function parseHTML(html) {
  if ("content" in document.createElement("template")) {
    var template = document.createElement("template");
    template.innerHTML = html.trim();
    return template.content.children;
  } else {
    // IE etc
    var parseDoc = document.implementation.createHTMLDocument();
    parseDoc.body.innerHTML = html.trim();
    return parseDoc.body.children;
  }
}

/**
 * Returns an element from an HTMLElement, string query selector or html string
 *
 * @param {any} elementOrSelector
 * @returns {HTMLElement}
 */
export function asElement(elementOrSelector) {
  if (elementOrSelector) {
    if (elementOrSelector instanceof HTMLElement) {
      return elementOrSelector;
    }

    if (typeof elementOrSelector === "string") {
      if (elementOrSelector.indexOf("<") === 0) {
        return parseHTML(elementOrSelector)[0];
      } else {
        return document.querySelector(elementOrSelector);
      }
    }
  }
}

/**
 * Same as jQuery.ready()
 *
 * @param {Function} fn
 */
export function ready(fn) {
  if (document.readyState !== "loading") {
    fn();
  } else {
    document.addEventListener("DOMContentLoaded", fn, {
      once: true,
    });
  }
}

/**
 * Concatenate className strings
 * 
 * @param {string} classNames - Strings with space-separated classNames
 * @returns string
 */ 
export function classNamesConcat(...classNames) {
  let classList = new Set();
  classNames.forEach((s) => s && s.split(" ").filter((x) => x).forEach((c) => classList.add(c)));
  return Array.from(classList).join(" ");
}
