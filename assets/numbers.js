/* Normalize digits at data boundaries; identifiers remain strings (including leading zeroes). */
(function (root, factory) {
  const api = factory();
  if (typeof module === 'object' && module.exports) module.exports = api;
  else root.EnsiyabNumbers = api;
})(typeof globalThis !== 'undefined' ? globalThis : this, function () {
  'use strict';
  function digits(value) {
    return String(value ?? '').replace(/[\u0660-\u0669\u06f0-\u06f9]/g, digit =>
      String(digit.charCodeAt(0) - (digit.charCodeAt(0) <= 0x669 ? 0x660 : 0x6f0)));
  }
  function integer(value, minimum = 0) {
    const raw = digits(value).trim();
    if (!/^[0-9]+$/.test(raw)) return NaN;
    const result = Number(raw);
    return Number.isSafeInteger(result) && result >= minimum ? result : NaN;
  }
  return {digits, integer};
});
