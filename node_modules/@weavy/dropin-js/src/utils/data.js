import { isPlainObject } from "./objects";

export const defaultFetchSettings = {
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

/**
 * Removes HTMLElement and Node from object before serializing. Used with JSON.stringify().
 *
 * @example
 * var jsonString = JSON.stringify(data, sanitizeJSON);
 *
 * @param {string} key
 * @param {any} value
 * @returns {any} - Returns the value or undefined if removed.
 */
export function sanitizeJSON(key, value) {
  // Filtering out DOM Elements and nodes
  if (value instanceof HTMLElement || value instanceof Node) {
    return undefined;
  }
  return value;
}

/**
 * Changes a string to snake_case from camelCase, PascalCase and spinal-case.
 *
 * @param {string} str - The string to change to snake case
 * @returns {string} The processed string as snake_case
 */
export function toSnakeCase(str) {
  if (str.length > 0) {
    return str
      .replace(/([a-z\d])([A-Z]+)/g, "$1_$2")
      .replace(/-|\s+/g, "_")
      .toLowerCase();
  } else {
    return str;
  }
}

/**
 * Changes a string to camelCase from PascalCase, spinal-case and snake_case.
 *
 * @param {string} str - The string to change to camel case
 * @param {boolean} pascal - Make ste string PascalCase
 * @returns {string} The processed string as camelCase or PascalCase
 */
export function toCamelCase(str, pascal) {
  if (pascal) {
    // to PascalCase
    str = str[0].toUpperCase() + str.substring(1);
  } else {
    // from PascalCase
    str = str[0].toLowerCase() + str.substring(1);
  }

  // from snake_case and spinal-case
  return str.replace(/([-_][a-z])/gi, function ($1) {
    return $1.toUpperCase().replace("-", "").replace("_", "");
  });
}

/**
 * Changes all object keys recursively to camelCase from PascalCase, spinal-case and snake_case.
 *
 * @param {Object} obj - The object containing keys to process
 * @param {boolean} pascal - Make keys PascalCase
 * @returns {Object} The processed object with any camelCase or PascalCase keys
 */
export function keysToCamelCase(obj, pascal) {
  if (isPlainObject(obj)) {
    const n = {};

    Object.keys(obj).forEach(function (k) {
      n[toCamelCase(k, pascal)] = keysToCamelCase(obj[k], pascal);
    });

    return n;
  } else if (Array.isArray(obj)) {
    return obj.map(function (i) {
      return keysToCamelCase(i, pascal);
    });
  }

  return obj;
}

/**
 * Changes all object keys recursively to PascalCase from camelCase, spinal-case and snake_case.
 *
 * @param {Object} obj - The object containing keys to process
 * @returns {Object} The processed object with any PascalCase keys
 */
export function keysToPascalCase(obj) {
  return keysToCamelCase(obj, true);
}

/**
 * Serializes a form to an object with data.
 *
 * @param {HTMLFormElement} form - The form to serialize
 * @param {boolean} snake_case - Use snake case for property names
 * @returns {Object}
 */
export function serializeObject(form, snake_case) {
  snake_case = snake_case || false;
  var o = {};
  var d = new FormData(form);

  d.forEach((value, name) => {
    var n = snake_case ? toSnakeCase(name) : name;
    if (o[n] !== undefined) {
      if (!o[n].push) {
        o[n] = [o[n]];
      }
      o[n].push(value || "");
    } else {
      o[n] = value || "";
    }
  });
  return o;
}

/**
 * Processing of JSON in a fetch response
 *
 * @param {external:Response} response - The fetch response to parse
 * @returns {Object|Response} The data if successful parsing, otherwise the response or an rejected error
 */
export async function processJSONResponse(response) {
  if (response) {
    let contentType = (
      response.headers.has("content-type")
        ? response.headers.get("content-type")
        : ""
    ).split(";")[0];

    if (response.ok) {
      if (contentType === "application/json") {
        try {
          let jsonData = await response.json();
          return keysToCamelCase(jsonData)
        } catch (e) {
          return null;
        }
      }
      return response;
    } else {
      // Parse error message from server
      if (contentType.match(/json$/i)) {
        try {
          let jsonData = await response.json()
          let jsonError = keysToCamelCase(jsonData);
          let responseError = jsonError.detail ||
            jsonError.title ||
            jsonError.message ||
            response.statusText ||
            jsonError.status

          if (responseError) {
            throw new Error(responseError);
          }
        } catch (e) {
          /* Could not extract any details */
        }
      }
      throw new Error(response.statusText);
    }
  }
}

/**
 * @external Response
 * @see https://developer.mozilla.org/en-US/docs/Web/API/Response
 */
