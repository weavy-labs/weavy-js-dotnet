/*
 * is-plain-object <https://github.com/jonschlinkert/is-plain-object>
 *
 * Copyright (c) 2014-2017, Jon Schlinkert.
 * Released under the MIT License.
 */

/**
 * Checks if an object is an object.
 *
 * @param {any} maybeObject - The object to check
 * @returns {boolean} True if the object is an object
 */
export function isObject(maybeObject) {
  return Object.prototype.toString.call(maybeObject) === "[object Object]";
}

/**
 * Checks if an object is a plain object {}, similar to jQuery.isPlainObject()
 *
 * @param {any} maybePlainObject - The object to check
 * @returns {boolean} True if the object is plain
 */
export function isPlainObject(maybePlainObject) {
  var ctor, prot;

  if (isObject(maybePlainObject) === false) return false;

  // If has modified constructor
  ctor = maybePlainObject.constructor;
  if (ctor === undefined) return true;

  // If has modified prototype
  prot = ctor.prototype;
  if (isObject(prot) === false) return false;

  // If constructor does not have an Object-specific method
  if (Object.prototype.hasOwnProperty.call(prot, "isPrototypeOf") === false) {
    return false;
  }

  // Most likely a plain Object
  return true;
}

/**
 * Method for extending plainObjects/options, similar to Object.assign() but with deep/recursive merging. If the recursive setting is applied it will merge any plain object children. Note that Arrays are treated as data and not as tree structure when merging.
 *
 * The original options passed are left untouched.
 *
 * @param {Object} source - Original options.
 * @param {Object} properties - Merged options that will replace options from the source.
 * @param {boolean} [recursive=false] True will merge any sub-objects of the options recursively. Otherwise sub-objects are treated as data.
 * @returns {Object} A new object containing the merged options.
 */
export function assign(source, properties, recursive) {
  source = source || {};
  properties = properties || {};

  var property;

  // Make a copy
  var copy = {};
  for (property in source) {
    if (Object.prototype.hasOwnProperty.call(source, property)) {
      copy[property] = source[property];
    }
  }

  // Apply properties to copy
  for (property in properties) {
    if (Object.prototype.hasOwnProperty.call(properties, property)) {
      if (
        recursive &&
        copy[property] &&
        isPlainObject(copy[property]) &&
        isPlainObject(properties[property])
      ) {
        copy[property] = assign(
          copy[property],
          properties[property],
          recursive
        );
      } else {
        copy[property] = properties[property];
      }
    }
  }
  return copy;
}

/**
 * Always returns an Array.
 *
 * @example
 * asArray(1); // [1]
 * asArray([1]); // [1]
 *
 * @param {any} maybeArray
 * @returns {Array}
 */
export function asArray(maybeArray) {
  return (
    (maybeArray && (Array.isArray(maybeArray) ? maybeArray : [maybeArray])) ||
    []
  );
}

/**
 * Case insensitive string comparison
 *
 * @param {any} str1 - The first string to compare
 * @param {any} str2 - The second string to compare
 * @param {boolean} ignoreType - Skip type check and use any stringified value
 * @returns {boolean}
 */
export function eqString(str1, str2, ignoreType) {
  return (
    (ignoreType || (typeof str1 === "string" && typeof str2 === "string")) &&
    String(str1).toUpperCase() === String(str2).toUpperCase()
  );
}

/**
 * Compares two plain objects. Compares all the properties in a to any properties in b.
 *
 * @param {any} a - The plain object to compare with b
 * @param {any} b - The plain object to compare properties from a to
 * @param {any} skipLength - Do not compare the number of properties
 * @returns {boolean}
 */
export function eqObjects(a, b, skipLength, anyObject) {
  if (!anyObject && (!isPlainObject(a) || !isPlainObject(b))) {
    return false;
  }
  if (anyObject && (!isObject(a) || !isObject(b))) {
    return false;
  }

  var aProps = Object.getOwnPropertyNames(a);
  var bProps = Object.getOwnPropertyNames(b);

  if (!skipLength && aProps.length !== bProps.length) {
    return false;
  }

  for (var i = 0; i < aProps.length; i++) {
    var propName = aProps[i];
    var propA = a[propName];
    var propB = b[propName];

    if (propA !== propB && !eqObjects(propA, propB, skipLength)) {
      return false;
    }
  }

  return true;
}
