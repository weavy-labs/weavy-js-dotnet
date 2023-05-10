import WeavyPromise from "./promise";

// TIMEOUT HANDLING

var _timeouts = [];

/**
 * Clears all current timeouts
 **/
export function clearTimeouts() {
  _timeouts.forEach(clearTimeout);
  _timeouts = [];
}

/**
 * Creates a managed timeout promise. Use this instead of window.setTimeout to get a timeout that is automatically managed and unregistered on destroy.
 *
 * @example
 * var mytimeout = whenTimeout(200).then(function() { ... });
 * mytimeout.cancel(); // Cancel the timeout
 *
 * @category promises
 * @function
 * @param {int} time=0 - Timeout in milliseconds
 * @returns {WeavyPromise}
 */
export function whenTimeout(time) {
  var timeoutId;
  var whenTimeout = new WeavyPromise();

  var removeIndex = () => {
    var timeoutIndex = _timeouts.indexOf(timeoutId);
    if (timeoutIndex >= 0) {
      _timeouts.splice(timeoutIndex, 1);
    }
  };

  _timeouts.push(
    (timeoutId = setTimeout(() => {
      whenTimeout.resolve();
    }, time))
  );

  whenTimeout.then(removeIndex);
  whenTimeout.catch(() => {
    removeIndex();
    clearTimeout(timeoutId);
    return Promise.reject(new Error("Timeout cancelled"));
  });

  whenTimeout.cancel = function () {
    removeIndex();
    clearTimeout(timeoutId);
  };

  return whenTimeout;
}
