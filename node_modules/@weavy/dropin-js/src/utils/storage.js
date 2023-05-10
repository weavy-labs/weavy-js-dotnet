import { sanitizeJSON } from "./objects";


var _storageAvailable = [];

export function storageAvailable(type) {
  if (!(type in _storageAvailable)) {
    var storage;
    try {
      storage = window[type];
      var x = '__storage_test__';
      storage.setItem(x, x);
      if (storage.getItem(x) !== x) {
        var er = new Error("Mismatching storage items.");
        er.name = "StorageMismatchError"
      }
      storage.removeItem(x);
      _storageAvailable[type] = true;
    } catch (e) {
      return e instanceof DOMException && (
          // everything except Firefox
          e.code === 22 ||
          // Firefox
          e.code === 1014 ||
          // test name field too, because code might not be present
          e.name === 'StorageMismatchError' ||
          // everything except Firefox
          e.name === 'QuotaExceededError' ||
          // Firefox
          e.name === 'NS_ERROR_DOM_QUOTA_REACHED') &&
        // acknowledge QuotaExceededError only if there's something already stored
        (storage && storage.length !== 0);
    }
  }
  return !!_storageAvailable[type];
}

// Fallback storage;
var _storage = new Map();

/**
 * Stores data for the current domain in the weavy namespace.
 * 
 * @category options
 * @param {string} key - The name of the data
 * @param {data} value - Data to store
 * @param {boolean} [asJson=false] - True if the data in value should be stored as JSON
 */
export function storeItem(key, value, asJson, type) {
  var keyName = 'weavy_' + window.location.hostname + "_" + key;
  type = type || 'localStorage';

  try {
    value = asJson ? JSON.stringify(value, sanitizeJSON) : value;

    if (storageAvailable(type)) {
      window[type].setItem(keyName, value);
    } else {
      throw new Error();
    }
  } catch (e) {
    console.warning("Using fallback storage:", key);
    _storage.set(keyName, value);
  }
}

/**
 * Retrieves data for the current domain from the weavy namespace.
 * 
 * @category options
 * @param {string} key - The name of the data to retrieve
 * @param {boolean} [isJson=false] - True if the data shoul be decoded from JSON
 * @returns {any}
 */
export function retrieveItem(key, isJson, type) {
  var value;
  var keyName = 'weavy_' + window.location.hostname + "_" + key;
  type = type || 'localStorage';

  try {
    if (storageAvailable(type)) {
      value = window[type].getItem(keyName);
    } else {
      throw new Error();
    }
  } catch (e) {
    console.warning("Retrieving fallback storage:", key);
    value = _storage.get(keyName);
  }

  if (value && isJson) {
    try {
      return JSON.parse(value);
    } catch (e) {
      /* value was not JSON */ }
  }

  return value;
}

