/**
 * Creates a DOM element with optional text content and class name.
 * Never uses innerHTML to prevent script injection vulnerabilities.
 * @param {string} tag - HTML tag name.
 * @param {string} [text] - Text content for the element.
 * @param {string} [className] - CSS class name string.
 * @returns {HTMLElement} The created element.
 */
function el(tag, text, className) {
  const element = document.createElement(tag);
  if (text !== undefined && text !== null) {
    element.textContent = String(text);
  }
  if (className) {
    element.className = className;
  }
  return element;
}

/**
 * Sends a POST JSON request to the API with structured error handling.
 * @param {string} path - Target API URL.
 * @param {object} payload - JSON payload object.
 * @returns {Promise<{ok: boolean, status: number, data: object}>}
 */
async function api(path, payload) {
  try {
    const res = await fetch(path, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });
    const data = await res.json().catch(() => ({}));
    return { ok: res.ok, status: res.status, data };
  } catch {
    return {
      ok: false,
      status: 0,
      data: { error: 'Network problem. Check your connection and try again.' }
    };
  }
}

/**
 * Formats API errors into a friendly human-readable message.
 * @param {{status: number, data: {details?: string[], error?: string}}} result
 * @returns {string}
 */
function describeError(result) {
  if (result.status === 400) {
    if (Array.isArray(result.data.details) && result.data.details.length > 0) {
      return result.data.details.join(' ');
    }
    return result.data.error || 'Please check your inputs and try again.';
  }
  if (result.status === 429) {
    return "You're going quickly. Please wait a minute.";
  }
  if (result.status >= 500) {
    return 'Something went wrong on our side. Please try again.';
  }
  return result.data.error || 'Unable to complete request. Please try again.';
}

/**
 * Loads and parses JSON from localStorage safely.
 * @param {string} key
 * @returns {any|null}
 */
function loadJSON(key) {
  try {
    const val = localStorage.getItem(key);
    return val ? JSON.parse(val) : null;
  } catch {
    return null;
  }
}

/**
 * Serializes and saves JSON to localStorage safely.
 * @param {string} key
 * @param {any} value
 * @returns {boolean}
 */
function saveJSON(key, value) {
  try {
    localStorage.setItem(key, JSON.stringify(value));
    return true;
  } catch {
    return false;
  }
}

/**
 * Loads and parses JSON from sessionStorage safely.
 * @param {string} key
 * @returns {any|null}
 */
function loadSession(key) {
  try {
    const val = sessionStorage.getItem(key);
    return val ? JSON.parse(val) : null;
  } catch {
    return null;
  }
}

/**
 * Serializes and saves JSON to sessionStorage safely.
 * @param {string} key
 * @param {any} value
 * @returns {boolean}
 */
function saveSession(key, value) {
  try {
    sessionStorage.setItem(key, JSON.stringify(value));
    return true;
  } catch {
    return false;
  }
}

/**
 * Formats an ISO date string (YYYY-MM-DD) into Indian English (e.g., '12 Mar 2027').
 * @param {string} iso - ISO date string.
 * @returns {string}
 */
function formatDate(iso) {
  if (!iso) return '';
  const parts = iso.split('-');
  if (parts.length !== 3) return iso;
  const d = new Date(Number(parts[0]), Number(parts[1]) - 1, Number(parts[2]));
  return d.toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });
}

/**
 * Computes a simple djb2 hash string for local storage keys.
 * @param {string} str
 * @returns {string}
 */
function hashString(str) {
  let hash = 5381;
  for (let i = 0; i < str.length; i++) {
    hash = ((hash << 5) + hash) + str.charCodeAt(i);
    hash |= 0;
  }
  return String(Math.abs(hash));
}

/**
 * Announces a message to screen readers using the polite live region.
 * @param {string} message
 */
function announce(message) {
  const live = document.getElementById('live-status');
  if (live) {
    live.textContent = '';
    setTimeout(() => {
      live.textContent = message;
    }, 50);
  }
}
