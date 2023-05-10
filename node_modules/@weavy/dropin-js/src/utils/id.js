const _weavyIds = [];

/**
 * Generate a S4 alphanumeric 4 character sequence suitable for non-sensitive GUID generation etc.
 */
export function S4() {
  return (((1 + Math.random()) * 0x10000) | 0).toString(16).substring(1);
}

/**
 * Function for generating a weavy id
 * @ignore
 * @param {string} id
 * @returns {string}
 */
export function generateId(id, onlyReturn) {
  id = "wy-" + (id ? id.replace(new RegExp("^wy-"), "") : S4() + S4());

  // Make sure id is unique
  if (_weavyIds.indexOf(id) !== -1) {
    id = generateId(id + S4(), true);
  }

  if (!onlyReturn) {
    _weavyIds.push(id);
  }

  return id;
}

/**
 * Function for removing a weavy id
 * @param {string} id 
 */
export function deleteId(id) {
    let idPos = _weavyIds.indexOf(id);
    if (idPos !== -1) {
        _weavyIds.splice(idPos, 1);
    }
}
