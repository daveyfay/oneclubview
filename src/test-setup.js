import '@testing-library/jest-dom';

// Node.js 25 ships a native (non-functional) localStorage/sessionStorage global
// that shadows jsdom's implementation. Restore jsdom's working versions.
if (typeof globalThis.jsdom !== 'undefined') {
  const jsdomWindow = globalThis.jsdom.window;
  Object.defineProperty(globalThis, 'localStorage', {
    configurable: true,
    enumerable: true,
    get: () => jsdomWindow.localStorage,
  });
  Object.defineProperty(globalThis, 'sessionStorage', {
    configurable: true,
    enumerable: true,
    get: () => jsdomWindow.sessionStorage,
  });
}
