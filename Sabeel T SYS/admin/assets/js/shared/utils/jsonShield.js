/**
 * Sabeel Academy - Global Anti-Cyclic JSON Protection
 * Prevents "TypeError: cyclic object value" across all browsers and environments.
 */

if (typeof window !== 'undefined' && !window.__sabeel_json_shield_active) {
  window.__sabeel_json_shield_active = true;
  const originalStringify = JSON.stringify;

  JSON.stringify = function(value, replacer, space) {
    const seen = new WeakSet();

    const cycleReplacer = function(key, val) {
      if (typeof val === 'object' && val !== null) {
        if (val instanceof Error) {
          return { name: val.name, message: val.message, stack: val.stack };
        }
        if (typeof Node !== 'undefined' && val instanceof Node) {
          return '[DOMNode ' + (val.nodeName || 'Element') + ']';
        }
        if (typeof Window !== 'undefined' && val instanceof Window) {
          return '[Window]';
        }
        if (seen.has(val)) {
          return '[Circular]';
        }
        seen.add(val);
      }
      if (typeof replacer === 'function') {
        return replacer.call(this, key, val);
      }
      return val;
    };

    try {
      return originalStringify(
        value,
        (typeof replacer === 'function' || !Array.isArray(replacer)) ? cycleReplacer : replacer,
        space
      );
    } catch (err) {
      if (err instanceof TypeError || String(err).includes('cyclic') || String(err).includes('circular')) {
        try {
          return originalStringify(value, cycleReplacer, space);
        } catch {
          return '"[Circular]"';
        }
      }
      throw err;
    }
  };
}

export const isJsonShieldActive = true;
