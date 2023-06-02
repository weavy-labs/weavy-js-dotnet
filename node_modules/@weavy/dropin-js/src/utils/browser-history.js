import WeavyConsole from "./console";
import { assign } from "./objects";

const console = new WeavyConsole("BrowserHistory");

/**
 * Gets the global state for all weavy instances combined, stored in the browser history state.
 * The state has the same structure as a single weavy instance state.
 *
 * @param {string} id - The group identifier for storage. 
 * @returns {object}
 */
export function getBrowserState(id) {
  var historyState = assign({}, window.history.state, true);
  historyState.weavy ??= {};
  historyState.weavy[id] ??= {};
  return historyState.weavy[id];
}

/**
 * Saves a weavy state to the browser history by either push or replace.
 * Any existing state will be preserved and existing states from other weavy instances will be merged.
 *
 * @param {string} id - The group id for storage.
 * @param {any} state - The state to add to any existing state
 * @param {string} [action] - If set to "replace", the current history state will be updated.
 * @param {any} [url] - Any new url to use for the state. If omitted, the current location will be reused.
 */
export function setBrowserState(id, state, action, url) {
  if (state) {
    console.debug((action || "setting") + " browser state", state);

    // Always modify any existing state

    var currentHistoryState = assign({}, window.history.state, true);
    currentHistoryState.weavy ??= {};

    currentHistoryState.weavy[id] = state;

    url = (url && String(url)) || window.location.href;

    try {
      if (action === "replace") {
        window.history.replaceState(currentHistoryState, null, url);
      } else {
        window.history.pushState(currentHistoryState, null, url);
      }
    } catch (e) {
      console.warn("history: Could not push history state.", e, state);
    }
  }
}
